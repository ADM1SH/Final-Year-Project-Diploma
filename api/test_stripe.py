"""
Manual debugging script — NOT an automated test case.

NOTE: Despite the `test_` filename prefix, this file is intentionally excluded
from Django's automated test run. Its logic is guarded behind `if __name__ ==
"__main__"` so importing it (which is what `manage.py test` does during test
discovery) has no side effects. Without this guard, the module-level database
query below would run against the empty test database during collection and
crash the entire test suite with an AttributeError before a single real test
could execute.

Usage (manual, against your real dev database):
    python manage.py shell -c "import api.test_stripe as s; s.main()"
"""
import os

import django


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    django.setup()

    import stripe
    from django.conf import settings
    from api.models import Transaction

    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Get the last transaction
    tx = Transaction.objects.order_by('-id').first()
    if not tx:
        print("No transactions found in the database.")
        return

    print(f"Latest Transaction: {tx.id}, Status: {tx.status}, Price: {tx.effective_price}")
    print(f"Buyer: {tx.buyer.username}, Seller: {tx.seller.username}")

    seller_profile = tx.seller.profile
    print(f"Seller Stripe ID: {seller_profile.stripe_account_id}")

    if seller_profile.stripe_account_id:
        balance = stripe.Balance.retrieve(stripe_account=seller_profile.stripe_account_id)
        print(f"Seller Balance: {balance}")

        transfers = stripe.Transfer.list(destination=seller_profile.stripe_account_id, limit=5)
        print("Recent transfers to seller:")
        for t in transfers.data:
            print(f" - {t.id}: {t.amount} {t.currency}")
    else:
        print("No stripe account for seller.")


if __name__ == "__main__":
    main()
