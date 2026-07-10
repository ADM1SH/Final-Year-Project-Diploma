"""
Concurrency regression test for TransactionViewSet.release_funds().

Guards against the TOCTOU race fixed in a prior session: two concurrent
release-funds calls (double-tap on "Confirm Receipt" in the mobile app, a
retried request after a flaky network response, etc.) must not both pass the
`status == PAID` check and both fire a real stripe.Transfer.create() — that
bug would pay the seller twice for the same item.

IMPORTANT — why this isn't a naive "spin up two threads and hope" test:

This project's dev/test database is SQLite (see core/settings.py). Django's
select_for_update() is a documented no-op on SQLite: the ORM silently drops
the "FOR UPDATE" clause and issues a plain SELECT, so SQLite provides no real
row-level locking guarantee the way PostgreSQL or MySQL/InnoDB do in
production. Concretely, if you fire two genuinely concurrent OS threads at
this endpoint against SQLite, BOTH threads' `select_for_update().get()` calls
can return status == "PAID" before either has written "COMPLETED" — the read
itself is never blocked. A test built that way would be flaky: it could pass
or fail depending on thread-scheduling luck, independent of whether the view
logic is actually correct, which is a bad regression gate for something this
important.

To make the test deterministic and meaningful on ANY backend (including this
project's SQLite), `Transaction.objects.select_for_update` is patched so the
*second* caller's row read genuinely blocks until the *first* caller's
request has fully committed — i.e. it manually reproduces the serialization
guarantee a real database row lock provides in production. This tests exactly
the application-level contract the fix depends on: "once one release-funds
call has landed, a second call for the same transaction must re-read the new
status and refuse to pay out again." Run this against PostgreSQL/MySQL before
go-live if you want proof the database itself also enforces it end-to-end —
on SQLite this test proves the *code* is correct, not that SQLite will
enforce it under real concurrent load.
"""
import threading
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Category, Item, Transaction


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class ReleaseFundsConcurrencyTests(TransactionTestCase):

    def setUp(self):
        self.buyer = User.objects.create_user(username='buyer', password='pw12345678')
        self.seller = User.objects.create_user(username='seller', password='pw12345678')

        # release_funds() requires the seller to have Stripe payouts configured.
        self.seller.profile.stripe_account_id = 'acct_test_123'
        self.seller.profile.save(update_fields=['stripe_account_id'])

        self.category = Category.objects.create(name='Tech')
        self.item = Item.objects.create(
            seller=self.seller, category=self.category, name='Race Condition Phone', price=500,
        )
        self.transaction = Transaction.objects.create(
            item=self.item, buyer=self.buyer, seller=self.seller,
            final_price=500, status=Transaction.Status.PAID,
            stripe_payment_intent_id='pi_test_123',
        )
        self.url = reverse('transaction-release-funds', args=[self.transaction.id])

    @staticmethod
    def _mock_stripe(mock_retrieve, mock_transfer):
        intent = MagicMock()
        intent.latest_charge = 'ch_test_123'
        mock_retrieve.return_value = intent
        mock_transfer.return_value = MagicMock(id='tr_test_123')

    @patch('api.views.transaction_views.stripe.Transfer.create')
    @patch('api.views.transaction_views.stripe.PaymentIntent.retrieve')
    def test_double_tap_release_funds_only_transfers_once(self, mock_retrieve, mock_transfer):
        """
        Two threads call release-funds for the same PAID transaction as the same
        buyer, simulating a double-tap on "Confirm Receipt". The second caller's
        select_for_update().get() is gated to block until the first caller's
        request has fully committed, reproducing real DB-lock serialization.
        Asserts stripe.Transfer.create fires exactly once and the transaction
        ends up COMPLETED exactly once (no duplicate payout).
        """
        self._mock_stripe(mock_retrieve, mock_transfer)

        first_call_claimed = threading.Event()
        first_call_finished = threading.Event()
        real_get = Transaction.objects.get

        def gate(*args, **kwargs):
            # First thread through proceeds immediately, as if it had acquired
            # the row lock uncontested. Any later thread blocks until the first
            # has committed its full request, then performs the real read —
            # exactly as it would after being unblocked by a real DB lock.
            if not first_call_claimed.is_set():
                first_call_claimed.set()
                return real_get(*args, **kwargs)
            first_call_finished.wait(timeout=5)
            return real_get(*args, **kwargs)

        results = {}

        def call_release(key):
            client = _auth_client(self.buyer)
            resp = client.post(self.url)
            results[key] = resp
            first_call_finished.set()  # no-op if this wasn't the first caller

        with patch.object(Transaction.objects, 'select_for_update') as mock_sfu:
            mock_sfu.return_value = MagicMock(get=gate)

            t1 = threading.Thread(target=call_release, args=('a',))
            t2 = threading.Thread(target=call_release, args=('b',))
            t1.start()
            first_call_claimed.wait(timeout=5)  # guarantee t1 is the "first" caller
            t2.start()
            t1.join(timeout=5)
            t2.join(timeout=5)

        # --- the core assertion this test exists for ---
        self.assertEqual(
            mock_transfer.call_count, 1,
            "stripe.Transfer.create must fire exactly once for one release-funds "
            "action, even under a double-tap / retried-request race.",
        )

        success_responses = [
            r for r in results.values()
            if r.status_code == 200 and r.data.get('status') == 'Funds released successfully.'
        ]
        self.assertEqual(len(success_responses), 1, "Exactly one caller should see the success response.")

        self.transaction.refresh_from_db()
        self.assertEqual(self.transaction.status, Transaction.Status.COMPLETED)

    @patch('api.views.transaction_views.stripe.Transfer.create')
    @patch('api.views.transaction_views.stripe.PaymentIntent.retrieve')
    def test_release_funds_rejected_when_not_paid(self, mock_retrieve, mock_transfer):
        """Sanity check: a transaction that isn't in PAID status is never transferable."""
        self._mock_stripe(mock_retrieve, mock_transfer)
        self.transaction.status = Transaction.Status.COMPLETED
        self.transaction.save(update_fields=['status'])

        client = _auth_client(self.buyer)
        resp = client.post(self.url)

        self.assertEqual(resp.status_code, 400)
        mock_transfer.assert_not_called()
