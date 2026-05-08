from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class Category(models.Model):
    """Categorizes items in the marketplace."""
    name = models.CharField(max_length=100, db_index=True)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Android icon reference")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    """Extended user data linked 1-to-1 with Django's User model."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    trust_score = models.FloatField(default=0.0, help_text="Calculated based on ABI model")
    is_verified = models.BooleanField(default=False, db_index=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Item(models.Model):
    """Represents a marketplace listing."""

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
    
    # Grading Survey Fields
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
        ordering = ['-created_at'] # Newest items first

    def calculate_grade(self):
        """Mathematically determines the grade based on survey points."""
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
        """Auto-calculate grade before saving to database."""
        self.calculated_grade = self.calculate_grade()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.get_calculated_grade_display()}"


class ItemImage(models.Model):
    """Multiple images for a single marketplace item."""
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='items/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.item.name}"


class Review(models.Model):
    """Ratings and feedback left by a buyer for a seller after a transaction."""
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
