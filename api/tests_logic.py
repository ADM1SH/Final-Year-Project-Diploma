# =====================================================================
# SYSTEM/PROJECT NAME: MyPreLove (Secondhand Eco-Marketplace Mobile App)
# COURSE: Diploma in Information Technology (DIT)
# MODULE: Final Year Project (FYP) - DIT3004 / DIT3102
# MEMBERS: Adam Anwar & FYP Group
# FILE NAME: tests_logic.py
# PURPOSE: Unit testing suite for validating backend business logic,
#          automated grading scoring, trust score recalculated points,
#          and custom message-offer creation workflows.
# =====================================================================

from django.test import TestCase
from django.contrib.auth.models import User
from .models import Item, Category, Profile, Transaction, Review

class LogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='password')
        self.category = Category.objects.create(name='Tech')

    def test_grading_calculator(self):
        """Test that the point-based grading system correctly assigns A-D grades."""
        # Case 1: Grade A (Like New) - 100 points
        item_a = Item.objects.create(
            seller=self.user, category=self.category, name='iPhone 15', price=1000,
            is_fully_functional=True, has_scratches=False, has_dents_cracks=False,
            has_original_box=True, has_receipt=True
        )
        self.assertEqual(item_a.calculated_grade, 'A')

        # Case 2: Grade B (Lightly Used) - 80 points
        item_b = Item.objects.create(
            seller=self.user, category=self.category, name='iPhone 14', price=800,
            is_fully_functional=True, has_scratches=True, has_dents_cracks=False,
            has_original_box=True, has_receipt=False
        )
        self.assertEqual(item_b.calculated_grade, 'B')

        # Case 3: Grade D (Heavily Used) - 40 points
        item_d = Item.objects.create(
            seller=self.user, category=self.category, name='Broken Phone', price=100,
            is_fully_functional=False, has_scratches=True, has_dents_cracks=True,
            has_original_box=False, has_receipt=False
        )
        self.assertEqual(item_d.calculated_grade, 'D')

    def test_abi_trust_score(self):
        """Test the ABI Trust Score algorithm (Integrity, Ability, Benevolence)."""
        # Create a seller
        seller_user = User.objects.create_user(username='seller', password='password')
        profile = seller_user.profile
        
        # 1. Integrity: Verified status (20 points)
        profile.is_verified = True
        profile.save()
        profile.recalculate_trust_score()
        profile.refresh_from_db()
        self.assertEqual(profile.trust_score, 20.0)

        # 2. Ability: Completed Sales (3 points per sale, max 30)
        item = Item.objects.create(seller=seller_user, category=self.category, name='Item', price=10)
        buyer = User.objects.create_user(username='buyer', password='password')
        
        # Create 2 completed sales
        for _ in range(2):
            Transaction.objects.create(item=item, seller=seller_user, buyer=buyer, status='COMPLETED', final_price=10)
        
        profile.recalculate_trust_score()
        profile.refresh_from_db()
        # 20 (Integrity) + 6 (Ability) = 26.0
        self.assertEqual(profile.trust_score, 26.0)

        # 3. Benevolence: Ratings (Avg * 10, max 50)
        # Add a 4-star review
        Review.objects.create(item=item, reviewer=buyer, seller=seller_user, rating=4, comment="Good!")
        
        profile.recalculate_trust_score()
        profile.refresh_from_db()
        # 26.0 + 40.0 = 66.0
        self.assertEqual(profile.trust_score, 66.0)

    def test_in_chat_bargaining_signals(self):
        """Test that transactions automatically create and update structured offer messages."""
        from .models import Message

        # Create buyer & seller
        buyer = User.objects.create_user(username='buyer_user', password='password')
        seller = User.objects.create_user(username='seller_user', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Bargain Item', price=100.00)

        # 1. Create Transaction (Pending Offer)
        tx = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=90.00,
            final_price=90.00,
            status='PENDING'
        )

        # Message should be generated automatically via post_save signal
        msg = Message.objects.filter(item=item, sender=buyer, receiver=seller).first()
        self.assertIsNotNone(msg)
        self.assertEqual(msg.content, f"[OFFER:{tx.id}:90.00:PENDING]")

        # 2. Update Transaction (Accept / Completed)
        tx.status = 'COMPLETED'
        tx.save()

        msg.refresh_from_db()
        self.assertEqual(msg.content, f"[OFFER:{tx.id}:90.00:COMPLETED]")

        # 3. Test fallback price handling when offer_price is None (seeded transactions)
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
        # Should fall back to final_price
        self.assertEqual(msg2.content, f"[OFFER:{tx2.id}:100.00:PENDING]")

    def test_wallet_transaction_and_validation(self):
        """Test wallet deduction/credit and insufficient balance validation rules."""
        from rest_framework.exceptions import ValidationError
        from .serializers import TransactionSerializer

        buyer = User.objects.create_user(username='wallet_buyer', password='password')
        seller = User.objects.create_user(username='wallet_seller', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Wallet Item', price=100.00)

        # Start with default 500.00
        self.assertEqual(buyer.profile.wallet_balance, 500.00)
        self.assertEqual(seller.profile.wallet_balance, 500.00)

        # Create serializer and try to set status=COMPLETED immediately with insufficient funds
        # 1. First test success case
        tx = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=100.00,
            final_price=100.00,
            payment_method='WALLET',
            status='PENDING'
        )

        # Transition status to COMPLETED
        tx.status = 'COMPLETED'
        tx.save()

        buyer.profile.refresh_from_db()
        seller.profile.refresh_from_db()
        self.assertEqual(buyer.profile.wallet_balance, 400.00)
        self.assertEqual(seller.profile.wallet_balance, 600.00)

        # 2. Test failure case (insufficient balance)
        item2 = Item.objects.create(seller=seller, category=self.category, name='Expensive Item', price=1000.00)
        tx2 = Transaction.objects.create(
            item=item2,
            buyer=buyer, # Balance is now 400.00
            seller=seller,
            offer_price=500.00,
            final_price=500.00,
            payment_method='WALLET',
            status='PENDING'
        )

        serializer = TransactionSerializer(instance=tx2, data={'status': 'COMPLETED'}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('status', serializer.errors)


    def test_cash_payment_skips_wallet_deduction(self):
        """Test that transactions with CASH payment method skip wallet validation and deductions."""
        from .serializers import TransactionSerializer
        from .models import WalletTransaction

        buyer = User.objects.create_user(username='cash_buyer', password='password')
        seller = User.objects.create_user(username='cash_seller', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Cash Item', price=100.00)

        # Buyer has 500.00 default. We make a transaction with price 600.00 (which exceeds wallet balance).
        # But payment method is 'CASH'
        tx = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=600.00,
            final_price=600.00,
            payment_method='CASH',
            status='PENDING'
        )

        # Transition status to COMPLETED - should succeed because it's CASH (no wallet validation)
        serializer = TransactionSerializer(instance=tx, data={'status': 'COMPLETED'}, partial=True)
        self.assertTrue(serializer.is_valid())
        serializer.save()

        # Check balances - should remain unchanged
        buyer.profile.refresh_from_db()
        seller.profile.refresh_from_db()
        self.assertEqual(buyer.profile.wallet_balance, 500.00)
        self.assertEqual(seller.profile.wallet_balance, 500.00)

        # Confirm no WalletTransaction audit logs were created for this transaction
        self.assertEqual(WalletTransaction.objects.filter(user=buyer).count(), 0)

    def test_wallet_ledger_audit_trail(self):
        """Test that WALLET transactions create correct WalletTransaction ledger logs."""
        from .models import WalletTransaction

        buyer = User.objects.create_user(username='audit_buyer', password='password')
        seller = User.objects.create_user(username='audit_seller', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Audit Item', price=50.00)

        # Let's perform a TOP_UP first via view/logic (manually)
        # Verify initial balance
        self.assertEqual(buyer.profile.wallet_balance, 500.00)

        # Log a top up of 100
        WalletTransaction.objects.create(
            user=buyer,
            amount=100.00,
            tx_type='TOP_UP',
            description="Topped up wallet balance"
        )
        buyer.profile.wallet_balance += 100.00
        buyer.profile.save()

        tx = Transaction.objects.create(
            item=item,
            buyer=buyer,
            seller=seller,
            offer_price=50.00,
            final_price=50.00,
            payment_method='WALLET',
            status='PENDING'
        )

        tx.status = 'COMPLETED'
        tx.save()

        # Verify ledger entries
        buyer_logs = WalletTransaction.objects.filter(user=buyer).order_by('created_at')
        self.assertEqual(buyer_logs.count(), 2)
        
        # Log 1: Top Up
        self.assertEqual(buyer_logs[0].tx_type, 'TOP_UP')
        self.assertEqual(buyer_logs[0].amount, 100.00)

        # Log 2: Purchase
        self.assertEqual(buyer_logs[1].tx_type, 'PURCHASE')
        self.assertEqual(buyer_logs[1].amount, 50.00)
        self.assertEqual(buyer_logs[1].description, f"Purchased: {item.name}")

        # Seller log: Sale
        seller_logs = WalletTransaction.objects.filter(user=seller)
        self.assertEqual(seller_logs.count(), 1)
        self.assertEqual(seller_logs[0].tx_type, 'SALE')
        self.assertEqual(seller_logs[0].amount, 50.00)
        self.assertEqual(seller_logs[0].description, f"Sold: {item.name}")

    def test_suggest_price_endpoint(self):
        """Test the AI suggest price API endpoint."""
        from django.urls import reverse
        url = reverse('suggest-price')

        # Test Case 1: Valid params
        payload = {
            'category': 'Tech',
            'brand': 'Apple',
            'condition_score': 9.0,
            'duration_days': 3,
            'original_price': 4000.0
        }
        response = self.client.post(url, payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('suggested_price', response.data)
        self.assertGreater(response.data['suggested_price'], 0)

        # Test Case 2: Invalid params
        bad_payload = {
            'category': 'Tech',
            'brand': 'Apple',
            'condition_score': 'invalid_score',
            'duration_days': 3,
            'original_price': 4000.0
        }
        response = self.client.post(url, bad_payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)

    def test_chat_offer_actions(self):
        """Test accept_offer and decline_offer custom viewset actions."""
        from django.urls import reverse
        from .models import Message

        buyer = User.objects.create_user(username='offer_buyer', password='password')
        seller = User.objects.create_user(username='offer_seller', password='password')
        item = Item.objects.create(seller=seller, category=self.category, name='Offer Item', price=100.00)

        # Create a pending offer message
        message = Message.objects.create(
            sender=buyer,
            receiver=seller,
            item=item,
            content="Check out this item!",
            is_offer=True,
            offer_price=90.00,
            offer_status='PENDING'
        )

        # Client authenticates as the seller (receiver) to accept
        from rest_framework.authtoken.models import Token
        token = Token.objects.create(user=seller)

        # Post accept action
        url = reverse('message-accept-offer', args=[message.id])
        response = self.client.post(url, **{'HTTP_AUTHORIZATION': f"Token {token.key}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['offer_status'], 'ACCEPTED')

        # Check DB status
        message.refresh_from_db()
        self.assertEqual(message.offer_status, 'ACCEPTED')

        # Reset and test decline
        message.offer_status = 'PENDING'
        message.save()

        # Post decline action
        url = reverse('message-decline-offer', args=[message.id])
        response = self.client.post(url, **{'HTTP_AUTHORIZATION': f"Token {token.key}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['offer_status'], 'DECLINED')

        message.refresh_from_db()
        self.assertEqual(message.offer_status, 'DECLINED')

    def test_scam_report_creation(self):
        """Test that users can submit fraud reports through the API Viewset."""
        from django.urls import reverse
        from rest_framework.authtoken.models import Token
        from .models import ScamReport

        reporter = User.objects.create_user(username='reporter_user', password='password')
        suspect = User.objects.create_user(username='suspect_user', password='password')
        item = Item.objects.create(seller=suspect, category=self.category, name='Scam Item', price=100)

        token = Token.objects.create(user=reporter)
        url = reverse('scam-report-list')
        
        payload = {
            'reported_user': suspect.id,
            'item': item.id,
            'reason': "Suspicious pricing, looks like counterfeit goods"
        }
        
        response = self.client.post(url, payload, content_type='application/json', **{'HTTP_AUTHORIZATION': f"Token {token.key}"})
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

        # 1. Search for KL location
        response = self.client.get(url, {'location': 'Kuala Lumpur'})
        self.assertEqual(response.status_code, 200)
        
        results = response.data
        item_ids = [x['id'] for x in results]
        self.assertIn(item_kl.id, item_ids)
        self.assertNotIn(item_penang.id, item_ids)

        # 2. Search for Penang location
        response = self.client.get(url, {'location': 'Penang'})
        self.assertEqual(response.status_code, 200)
        
        results = response.data
        item_ids = [x['id'] for x in results]
        self.assertIn(item_penang.id, item_ids)
        self.assertNotIn(item_kl.id, item_ids)

