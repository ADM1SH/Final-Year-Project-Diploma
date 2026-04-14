from django.db import models
from django.contrib.auth.models import User

# 1. The Category Model
class Category(models.Model):
    name = models.CharField(max_length=100)
    icon_name = models.CharField(max_length=50, blank=True) # Useful for Android icons

    def __str__(self):
        return self.name

# 2. The User Profile Model
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    trust_score = models.FloatField(default=0.0)
    is_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True)

    def __str__(self):
        return self.user.username

# 3. The Item Model
class Item(models.Model):
    # Grade choices for the grading system
    GRADE_CHOICES = [
        ('A', 'Grade A - Like New'),
        ('B', 'Grade B - Lightly Used'),
        ('C', 'Grade C - Well Used'),
        ('D', 'Grade D - Heavily Used'),
    ]

    seller = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Grading fields
    calculated_grade = models.CharField(max_length=1, choices=GRADE_CHOICES)
    is_sold = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.calculated_grade})"

# 4. The Review & Rating Model
class Review(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE)
    reviewer = models.ForeignKey(User, related_name='reviews_given', on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name='reviews_received', on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)]) # 1 to 5 stars
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.seller.username} - {self.rating} Stars"
