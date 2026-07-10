"""
Contains Django test cases to verify business logic, point-based grading rules,
ABI trust score recalculations, in-chat bargaining/offer actions, scam reports,
location filtering, and the direct password-reset flow.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from .models import Item, Category, Transaction, Review

class LogicTests(TestCase):
    def setUp(self):
        # Configure initial database states including test user and category
        self.user = User.objects.create_user(username='tester', password='password')
        self.category = Category.objects.create(name='Tech')

    def test_grading_calculator(self):
        """Test that the point-based grading system correctly assigns A-D grades."""

        item_a = Item.objects.create(
            seller=self.user, category=self.category, name='iPhone 15', price=1000,
            is_fully_functional=True, has_scratches=False, has_dents_cracks=False,
            has_original_box=True, has_receipt=True
        )
        self.assertEqual(item_a.calculated_grade, 'A')


        item_b = Item.objects.create(
            seller=self.user, category=self.category, name='iPhone 14', price=800,
            is_fully_functional=True, has_scratches=True, has_dents_cracks=False,
            has_original_box=True, has_receipt=False
        )
        self.assertEqual(item_b.calculated_grade, 'B')


        item_d = Item.objects.create(
            seller=self.user, category=self.category, name='Broken Phone', price=100,
            is_fully_functional=False, has_scratches=True, has_dents_cracks=True,
            has_original_box=False, has_receipt=False
        )
        self.assertEqual(item_d.calculated_grade, 'D')

    def test_abi_trust_score(self):
        """Test the ABI Trust Score algorithm (Integrity, Ability, Benevolence)."""

        seller_user = User.objects.create_user(username='seller', password='password')
        profile = seller_user.profile


        profile.is_verified = True
        profile.save()
        profile.recalculate_trust_score()
        profile.refresh_from_db()
        self.assertEqual(profile.trust_score, 20.0)


        item = Item.objects.create(seller=seller_user, category=self.category, name='Item', price=10)
        buyer = User.objects.create_user(username='buyer', password='password')


        # Create multiple completed transactions to verify trust score accumulation
        for i in range(2):
            new_item = Item.objects.create(seller=seller_user, category=self.category, name=f'Item {i}', price=10)
            Transaction.objects.create(item=new_item, seller=seller_user, buyer=buyer, status='COMPLETED', final_price=10)

        profile.recalculate_trust_score()
        profile.refresh_from_db()

        self.assertEqual(profile.trust_score, 26.0)


        Review.objects.create(item=item, reviewer=buyer, seller=seller_user, rating=4, comment="Good!")

        profile.recalculate_trust_score()
        profile.refresh_from_db()

        self.assertEqual(profile.trust_score, 66.0)

    def test_in_chat_bargaining_signals(self):
        """Test that transactions automatically create and update structured offer messages."""
        from .models import Message


        buyer = User.objects.create_user(username='buyer_user', password='password')
        seller = User.objects.create_user(username='seller_user', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Bargain Item', price=100.00)


        tx = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=90.00,
            final_price=90.00,
            status='PENDING'
        )


        msg = Message.objects.filter(item=item, sender=buyer, receiver=seller).first()
        self.assertIsNotNone(msg)
        self.assertEqual(msg.content, f"[OFFER:{tx.id}:90.00:PENDING]")


        tx.status = 'COMPLETED'
        tx.save()

        msg.refresh_from_db()
        self.assertEqual(msg.content, f"[OFFER:{tx.id}:90.00:COMPLETED]")


        tx2 = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=None,
            final_price=100.00,
            status='PENDING'
        )

        msg2 = Message.objects.filter(item=item, sender=buyer, receiver=seller).exclude(id=msg.id).first()
        self.assertIsNotNone(msg2)

        self.assertEqual(msg2.content, f"[OFFER:{tx2.id}:100.00:PENDING]")

    # NOTE: The original wallet-balance ledger tests that lived here (top-up,
    # cash-payment skip, audit trail) tested a Profile.wallet_balance field and
    # a WalletTransaction model that no longer exist — the app now settles
    # payments through Stripe Connect escrow (see TransactionViewSet.create_payment_intent
    # / release_funds) instead of an in-app wallet. Removed to keep the suite green;
    # Stripe's escrow flow is covered by manual testing (test_stripe.py) since it
    # requires live Stripe test-mode API calls.

    def test_suggest_price_endpoint(self):
        """Test the AI suggest price API endpoint."""
        from django.urls import reverse
        from rest_framework_simplejwt.tokens import RefreshToken
        url = reverse('suggest-price')

        # Authenticate the test client — suggest_price now requires a valid token.
        refresh = RefreshToken.for_user(self.user)
        auth_header = {'HTTP_AUTHORIZATION': f'Bearer {str(refresh.access_token)}'}

        payload = {
            'category': 'Tech',
            'brand': 'Apple',
            'condition_score': 9.0,
            'duration_days': 3,
            'original_price': 4000.0
        }
        # Dispatch request to price suggestion endpoint with valid params.
        response = self.client.post(url, payload, content_type='application/json', **auth_header)
        self.assertEqual(response.status_code, 200)
        self.assertIn('suggested_price', response.data)
        self.assertGreater(response.data['suggested_price'], 0)

        # Confirm the validator rejects non-numeric condition scores.
        bad_payload = {
            'category': 'Tech',
            'brand': 'Apple',
            'condition_score': 'invalid_score',
            'duration_days': 3,
            'original_price': 4000.0
        }
        response = self.client.post(url, bad_payload, content_type='application/json', **auth_header)

    def test_chat_offer_actions(self):
        """Test accept_offer and decline_offer custom viewset actions."""
        from django.urls import reverse
        from .models import Message

        buyer = User.objects.create_user(username='offer_buyer', password='password')
        seller = User.objects.create_user(username='offer_seller', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Offer Item', price=100.00)


        message = Message.objects.create(
            sender=buyer,
            receiver=seller,
            item=item,
            content="Check out this item!",
            is_offer=True,
            offer_price=90.00,
            offer_status='PENDING'
        )


        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(seller)
        auth_header = {'HTTP_AUTHORIZATION': f"Bearer {str(refresh.access_token)}"}


        url = reverse('message-accept-offer', args=[message.id])
        response = self.client.post(url, **auth_header)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['offer_status'], 'ACCEPTED')


        message.refresh_from_db()
        self.assertEqual(message.offer_status, 'ACCEPTED')


        message.offer_status = 'PENDING'
        message.save()


        url = reverse('message-decline-offer', args=[message.id])
        response = self.client.post(url, **auth_header)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['offer_status'], 'DECLINED')

        message.refresh_from_db()
        self.assertEqual(message.offer_status, 'DECLINED')

    def test_scam_report_creation(self):
        """Test that users can submit fraud reports through the API Viewset."""
        from django.urls import reverse
        from rest_framework_simplejwt.tokens import RefreshToken
        from .models import ScamReport

        reporter = User.objects.create_user(username='reporter_user', password='password')
        suspect = User.objects.create_user(username='suspect_user', password='password')
        item = Item.objects.create(seller=suspect, category=self.category, name='Scam Item', price=100)

        refresh = RefreshToken.for_user(reporter)
        auth_header = {'HTTP_AUTHORIZATION': f"Bearer {str(refresh.access_token)}"}
        url = reverse('scam-report-list')

        payload = {
            'reported_user': suspect.id,
            'item': item.id,
            'reason': "Suspicious pricing, looks like counterfeit goods"
        }

        response = self.client.post(url, payload, content_type='application/json', **auth_header)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ScamReport.objects.filter(reporter=reporter).count(), 1)

        report = ScamReport.objects.filter(reporter=reporter).first()
        self.assertEqual(report.reported_user, suspect)
        self.assertEqual(report.item, item)
        self.assertEqual(report.reason, "Suspicious pricing, looks like counterfeit goods")

    def test_location_filtering(self):
        """Test that items can be filtered by seller profile location query parameter."""
        from django.urls import reverse

        seller_kl = User.objects.create_user(username='kl_seller', password='password')
        seller_kl.profile.location = "Kuala Lumpur"
        seller_kl.profile.save()

        seller_penang = User.objects.create_user(username='penang_seller', password='password')
        seller_penang.profile.location = "Penang"
        seller_penang.profile.save()

        item_kl = Item.objects.create(seller=seller_kl, category=self.category, name='KL Product', price=100)
        item_penang = Item.objects.create(seller=seller_penang, category=self.category, name='Penang Product', price=200)

        url = reverse('item-list')


        response = self.client.get(url, {'location': 'Kuala Lumpur'})
        self.assertEqual(response.status_code, 200)

        results = response.data
        item_ids = [x['id'] for x in results]
        self.assertIn(item_kl.id, item_ids)
        self.assertNotIn(item_penang.id, item_ids)


        response = self.client.get(url, {'location': 'Penang'})
        self.assertEqual(response.status_code, 200)

        results = response.data
        item_ids = [x['id'] for x in results]
        self.assertIn(item_penang.id, item_ids)
        self.assertNotIn(item_kl.id, item_ids)

    def test_forgot_password_reset(self):
        """
        Test the direct password-reset endpoint actually used by the app
        (PasswordResetDirectView / POST /api/password-reset/direct/).

        NOTE: This intentionally simplified, username-only reset (no email
        verification step) is a deliberate FYP-demo simplification — see the
        docstring on PasswordResetDirectView for the justification.
        """
        from django.urls import reverse

        user = User.objects.create_user(username='reset_target', email='reset@example.com', password='old_password')
        url = reverse('password-reset-direct')

        # Too-short password should be rejected.
        response = self.client.post(
            url,
            {'username': 'reset_target', 'new_password': 'short'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

        # Unknown username should 404.
        response = self.client.post(
            url,
            {'username': 'no_such_user', 'new_password': 'new_pass123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

        # Valid request resets the password.
        response = self.client.post(
            url,
            {'username': 'reset_target', 'new_password': 'new_pass123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        self.assertTrue(user.check_password('new_pass123'))
