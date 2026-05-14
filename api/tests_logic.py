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
