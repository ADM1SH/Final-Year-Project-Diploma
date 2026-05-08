from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# Libraries for image compression
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image as PILImage
import os

def compress_image(image_field):
    """
    This function takes an uploaded image and makes it smaller (JPEG format, 70% quality).
    This saves storage space and makes the app load faster for users.
    """
    if not image_field:
        return
    
    img = PILImage.open(image_field)
    
    # Convert to RGB if necessary (removes transparency for JPEG compatibility)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Save the compressed version into memory
    output = BytesIO()
    img.save(output, format='JPEG', quality=70, optimize=True)
    output.seek(0)
    
    # Replace the original large file with the new small one
    name = os.path.splitext(os.path.basename(image_field.name))[0]
    image_field.save(f"{name}.jpg", ContentFile(output.read()), save=False)


class Category(models.Model):
    """
    Stores item categories like 'Electronics' or 'Fashion'.
    icon_name is used to tell the Android app which icon to display.
    """
    name = models.CharField(max_length=100, db_index=True)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Android icon reference")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    """
    Extends the basic User model to store marketplace-specific info.
    Includes the Trust Score and whether the user's identity is verified.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    trust_score = models.FloatField(default=0.0, help_text="Calculated based on ABI model")
    is_verified = models.BooleanField(default=False, db_index=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)

    def save(self, *args, **kwargs):
        # Automatically compress the profile picture before saving
        if self.profile_picture:
            compress_image(self.profile_picture)
        super().save(*args, **kwargs)

    def recalculate_trust_score(self):
        """
        The 'Brain' of the Trust System. It follows the ABI Model:
        1. Integrity (20 pts): Are you verified?
        2. Ability (30 pts): How many successful sales have you done?
        3. Benevolence (50 pts): What is your average star rating from others?
        """
        score = 0.0
        
        # Check Identity Verification
        if self.is_verified:
            score += 20.0
            
        # Count completed sales (max 10 sales for 30 points)
        completed_sales_count = self.user.sales.filter(status='COMPLETED').count()
        score += min(completed_sales_count * 3.0, 30.0)
        
        # Factor in average ratings from reviews
        avg_rating = self.user.reviews_received.aggregate(models.Avg('rating'))['rating__avg']
        if avg_rating:
            score += (avg_rating * 10.0)
            
        self.trust_score = round(score, 1)
        self.save()

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Item(models.Model):
    """
    The main model for marketplace listings. 
    It stores the price, condition survey, and calculated grade.
    """

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
    
    # These fields make up the 'Condition Survey'
    is_fully_functional = models.BooleanField(default=True)
    has_scratches = models.BooleanField(default=False)
    has_dents_cracks = models.BooleanField(default=False)
    has_original_box = models.BooleanField(default=False)
    has_receipt = models.BooleanField(default=False)

    calculated_grade = models.CharField(max_length=1, choices=Grade.choices, db_index=True, blank=True)
    is_sold = models.BooleanField(default=False, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at'] # Shows newest items first

    def calculate_grade(self):
        """
        Objective math for item condition. 
        Higher points = Better Grade.
        """
        score = 0
        if self.is_fully_functional: score += 40
        if not self.has_scratches: score += 20
        if not self.has_dents_cracks: score += 20
        if self.has_original_box: score += 10
        if self.has_receipt: score += 10

        if score >= 90: return self.Grade.A
        if score >= 70: return self.Grade.B
        if score >= 50: return self.Grade.C
        return self.Grade.D

    def save(self, *args, **kwargs):
        # Every time an item is saved, we re-run the grade calculation
        self.calculated_grade = self.calculate_grade()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.get_calculated_grade_display()}"


class ItemImage(models.Model):
    """
    Stores images for items. Each item can have multiple images (a gallery).
    """
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='items/')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Also compress item photos for better performance
        if self.image:
            compress_image(self.image)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.item.name}"


class Notification(models.Model):
    """
    Internal alerts. Used to notify users when they get a message, a sale, or a review.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"


class Transaction(models.Model):
    """
    Represents a formal agreement/sale between a buyer and a seller.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transaction: {self.item.name} - {self.status}"


class Message(models.Model):
    """
    Individual chat messages sent within the app. 
    Helps keep users safe inside the 'secure zone'.
    """
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username}"


class ScamReport(models.Model):
    """
    Allows users to report fraud or suspicious listings to the admin.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        INVESTIGATING = 'INVESTIGATING', 'Under Investigation'
        RESOLVED = 'RESOLVED', 'Resolved'
        DISMISSED = 'DISMISSED', 'Dismissed'

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='scam_reports')
    
    reason = models.TextField(help_text="Describe the suspicious behavior")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report by {self.reporter.username} against {self.reported_user.username}"


class Review(models.Model):
    """
    Post-transaction feedback left by the buyer for the seller.
    """
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')

    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ for {self.seller.username} by {self.reviewer.username}"
