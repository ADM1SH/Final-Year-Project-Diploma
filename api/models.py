# models.py
# Database tables for MyPreLove.
# This file defines structures for users, items, and sales.

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# Libraries for image compression
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image as PILImage
import os

def compress_image(image_field):
    # Shrink images to JPEG format.
    # Use 70 percent quality.
    # This saves space and increases speed.
    if not image_field:
        return

    img = PILImage.open(image_field)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = BytesIO()
    img.save(output, format='JPEG', quality=70, optimize=True)
    output.seek(0)

    name = os.path.splitext(os.path.basename(image_field.name))[0]
    image_field.save(f"{name}.jpg", ContentFile(output.read()), save=False)


class Category(models.Model):
    # Store item types. 
    # Use icon_name for Android icons.
    name = models.CharField(max_length=100, db_index=True)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Android icon reference")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    # Extend user data. 
    # Store trust scores and verification status.
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    trust_score = models.FloatField(default=0.0, help_text="Calculated based on ABI model")
    is_verified = models.BooleanField(default=False, db_index=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)

    def save(self, *args, **kwargs):
        if self.profile_picture:
            compress_image(self.profile_picture)
        super().save(*args, **kwargs)

    def recalculate_trust_score(self):
        # Calculate trust with the ABI model. 
        # Integrity equals 20 points. 
        # Ability equals 30 points. 
        # Benevolence equals 50 points.
        score = 0.0

        if self.is_verified:
            score += 20.0

        completed_sales_count = self.user.sales.filter(status='COMPLETED').count()
        score += min(completed_sales_count * 3.0, 30.0)

        avg_rating = self.user.reviews_received.aggregate(models.Avg('rating'))['rating__avg']
        if avg_rating:
            score += (avg_rating * 10.0)

        self.trust_score = round(score, 1)
        # Update the database. 
        # Avoid triggering signals to prevent infinite loops.
        Profile.objects.filter(pk=self.pk).update(trust_score=self.trust_score)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Item(models.Model):
    # Individual marketplace listings. 
    # Store price and condition grade.
    class Grade(models.TextChoices):
        A = 'A', 'Grade A - Like New'
        B = 'B', 'Grade B - Lightly Used'
        C = 'C', 'Grade C - Well Used'
        D = 'D', 'Grade D - Heavily Used'

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='items')

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    weight = models.FloatField(default=0.0, help_text="Weight of the item in kg")
    
    # New fields for design alignment
    eco_impact = models.FloatField(default=0.0, help_text="CO2 saved in kg")
    is_negotiable = models.BooleanField(default=False)

    is_fully_functional = models.BooleanField(default=True)
    has_scratches = models.BooleanField(default=False)
    has_dents_cracks = models.BooleanField(default=False)
    has_original_box = models.BooleanField(default=False)
    has_receipt = models.BooleanField(default=False)
    
    # Expanded grading fields
    is_clean = models.BooleanField(default=True, help_text="Item is free of stains, dust, or odors")
    has_all_accessories = models.BooleanField(default=True, help_text="Includes all original chargers, cables, or parts")
    has_repair_history = models.BooleanField(default=False, help_text="Item has been repaired before")
    battery_health_good = models.BooleanField(default=True, help_text="Battery lasts a reasonable time (if applicable)")
    is_modified = models.BooleanField(default=False, help_text="Item has been customized or altered from original state")

    calculated_grade = models.CharField(max_length=1, choices=Grade.choices, db_index=True, blank=True)
    is_sold = models.BooleanField(default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def calculate_grade(self):
        # Determine condition grade based on Category-specific weighting.
        score = 0
        cat_name = self.category.name if self.category else 'Others'
        
        if cat_name == 'Tech':
            # Tech priorities: Functionality & Provenance
            if self.is_fully_functional: score += 40
            if not self.has_repair_history: score += 10
            if self.battery_health_good: score += 10
            if not self.has_scratches: score += 5
            if not self.has_dents_cracks: score += 5
            if self.has_original_box: score += 10
            if self.has_receipt: score += 10
            if self.has_all_accessories: score += 5
            if self.is_clean: score += 5
        elif cat_name in ['Men', 'Women', 'Luxury']:
            # Fashion/Luxury priorities: Cosmetic, Cleanliness & Authenticity (Original Box/Receipt)
            if self.is_fully_functional: score += 10 # Meaning zippers/buttons work
            if not self.has_scratches: score += 20 # Meaning rips/stains
            if self.is_clean: score += 20
            if not self.is_modified: score += 10
            if self.has_original_box: score += 15 # Tags/Dust bag
            if self.has_receipt: score += 15
            if self.has_all_accessories: score += 10
        else:
            # Default weighting (Home & Living, Others, etc.)
            if self.is_fully_functional: score += 30
            if not self.has_scratches: score += 15
            if not self.has_dents_cracks: score += 15
            if self.is_clean: score += 15
            if self.has_all_accessories: score += 10
            if self.has_original_box: score += 10
            if self.has_receipt: score += 5

        if score >= 90: return self.Grade.A
        if score >= 70: return self.Grade.B
        if score >= 50: return self.Grade.C
        return self.Grade.D

    def save(self, *args, **kwargs):
        self.calculated_grade = self.calculate_grade()
        # Calculate eco impact based on weight (approx 2.5kg of CO2 saved per 1kg of item)
        if self.weight > 0:
            self.eco_impact = float(self.weight) * 2.5
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.get_calculated_grade_display()}"


class ItemImage(models.Model):
    # Support multiple images for items.
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='items/')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.image:
            compress_image(self.image)
        super().save(*args, **kwargs)


class Notification(models.Model):
    # Store user alerts for messages and sales.
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    related_id = models.IntegerField(null=True, blank=True) # ID of item or user for deep linking
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Transaction(models.Model):
    # Track sales between buyers and sellers.
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash on Delivery'
        TRANSFER = 'TRANSFER', 'Bank Transfer'
        TNG = 'TNG', 'Touch n Go eWallet'
        GRABPAY = 'GRABPAY', 'GrabPay'
        WALLET = 'WALLET', 'MyPreLove Cash Wallet'

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')

    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class WalletTransaction(models.Model):
    class TxType(models.TextChoices):
        TOP_UP = 'TOP_UP', 'Top Up'
        PURCHASE = 'PURCHASE', 'Purchase'
        SALE = 'SALE', 'Sale'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tx_type = models.CharField(max_length=20, choices=TxType.choices)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.tx_type} - RM {self.amount:.2f}"



class Message(models.Model):
    # Manage in app chat messages.
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')

    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['timestamp']


class ScamReport(models.Model):
    # Enable fraud reporting.
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        INVESTIGATING = 'INVESTIGATING', 'Under Investigation'
        RESOLVED = 'RESOLVED', 'Resolved'
        DISMISSED = 'DISMISSED', 'Dismissed'

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='scam_reports')

    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Review(models.Model):
    # Post transaction feedback for sellers.
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')

    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)


class Favorite(models.Model):
    # Track user's liked items.
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'item')
        ordering = ['-created_at']
