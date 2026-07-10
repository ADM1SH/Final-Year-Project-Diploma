"""
Defines the database models for the peer-to-peer marketplace,
including profiles, listings, transactions, reviews, messaging, and blocks.
"""
# --- stdlib ---
import os
from io import BytesIO

# --- third-party ---
from PIL import Image as PILImage

# --- django ---
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def compress_image(image_field):
    """
    Compresses and converts an uploaded image to JPEG in-place.
    Operates on the ImageFieldFile directly — does NOT call .save() on the model.
    """
    if not image_field:
        return

    img = PILImage.open(image_field)

    # Convert RGBA/P images to standard RGB format to allow saving as JPEG.
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = BytesIO()
    img.save(output, format='JPEG', quality=70, optimize=True)
    output.seek(0)

    name = os.path.splitext(os.path.basename(image_field.name))[0]
    # save=False prevents recursive model.save() calls.
    image_field.save(f"{name}.jpg", ContentFile(output.read()), save=False)


class Category(models.Model):

    name = models.CharField(max_length=100, db_index=True)
    icon_name = models.CharField(max_length=50, blank=True, help_text="Android icon reference")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    trust_score = models.FloatField(default=0.0, help_text="Calculated based on ABI model")
    is_verified = models.BooleanField(default=False, db_index=True)

    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    verification_document = models.ImageField(upload_to='verification_docs/', blank=True, null=True)
    # Stripe Connected Account ID for payouts
    stripe_account_id = models.CharField(max_length=255, null=True, blank=True)

    location = models.CharField(max_length=255, blank=True, default='', db_index=True)
    bio = models.TextField(blank=True, default='')
    phone_number = models.CharField(max_length=20, blank=True, default='')

    # Stores 9 hashed recovery words (via make_password) generated at registration.
    # Used as an email-free password reset mechanism: the user must supply the
    # correct words at 3 randomly-chosen positions to reset their password.
    recovery_keywords = models.JSONField(default=list, blank=True)

    def save(self, *args, **kwargs):
        # Only compress images when the relevant field is being updated (or on first save).
        # update_fields guard prevents unnecessary PIL overhead on every partial save.
        update_fields = kwargs.get('update_fields')
        if update_fields is None or 'profile_picture' in update_fields:
            if self.profile_picture:
                compress_image(self.profile_picture)
        if update_fields is None or 'verification_document' in update_fields:
            if self.verification_document:
                compress_image(self.verification_document)
        super().save(*args, **kwargs)

    def recalculate_trust_score(self):
        """
        Recomputes and persists the ABI trust score for this profile.
        Uses a targeted UPDATE to avoid triggering the Profile post_save signal
        and to avoid re-compressing images unnecessarily.
        """
        score = 0.0

        # Verification provides a base trust bonus.
        if self.is_verified:
            score += 20.0

        # Successful sales build credibility, capped to prevent spam manipulation.
        completed_sales_count = self.user.sales.filter(status='COMPLETED').count()
        score += min(completed_sales_count * 3.0, 30.0)

        # Average rating from other users contributes to the score.
        avg_rating = self.user.reviews_received.aggregate(models.Avg('rating'))['rating__avg']
        if avg_rating:
            score += avg_rating * 10.0

        self.trust_score = round(score, 1)

        # Use a targeted UPDATE so the Profile post_save signal is NOT re-triggered,
        # preventing an infinite recalculation loop.
        Profile.objects.filter(pk=self.pk).update(trust_score=self.trust_score)

    @property
    def response_time(self):
        """
        Computes a human-readable average response latency for this seller.
        Uses caching to avoid N+1 queries during listing serializations.
        """
        from django.core.cache import cache
        cache_key = f"profile_{self.pk}_response_time"
        cached = cache.get(cache_key)
        if cached:
            return cached

        from django.apps import apps
        from django.db.models import Q

        Message = apps.get_model('api', 'Message')

        # Limit to the last 100 messages to prevent memory bloat, then sort ascending
        msgs_qs = Message.objects.filter(
            Q(receiver=self.user, item__isnull=False) |
            Q(sender=self.user, item__isnull=False)
        ).values('item_id', 'sender_id', 'receiver_id', 'timestamp').order_by('-timestamp')[:100]
        
        msgs = sorted(list(msgs_qs), key=lambda x: x['timestamp'])

        threads = {}
        total_seconds = []

        for m in msgs:
            other_user = m['sender_id'] if m['receiver_id'] == self.user.id else m['receiver_id']
            key = (m['item_id'], other_user)

            if key not in threads:
                threads[key] = {'first_msg': None, 'first_reply': None}

            if m['receiver_id'] == self.user.id and threads[key]['first_msg'] is None:
                threads[key]['first_msg'] = m['timestamp']
            elif (
                m['sender_id'] == self.user.id
                and threads[key]['first_msg'] is not None
                and threads[key]['first_reply'] is None
            ):
                threads[key]['first_reply'] = m['timestamp']
                diff = m['timestamp'] - threads[key]['first_msg']
                total_seconds.append(diff.total_seconds())

        if not threads:
            result = "No messages received yet"
        elif not total_seconds:
            result = "No replies yet"
        else:
            avg_seconds = sum(total_seconds) / len(total_seconds)
            if avg_seconds < 3600:
                result = "Typically replies in minutes"
            elif avg_seconds < 14400:
                result = "Typically replies in a few hours"
            elif avg_seconds < 86400:
                result = "Typically replies within a day"
            else:
                result = "Typically replies in a few days"

        cache.set(cache_key, result, 3600)  # cache for 1 hour
        return result

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Item(models.Model):

    class Grade(models.TextChoices):
        A = 'A', 'Grade A - Like New'
        B = 'B', 'Grade B - Lightly Used'
        C = 'C', 'Grade C - Well Used'
        D = 'D', 'Grade D - Heavily Used'

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='items')

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, db_index=True)
    weight = models.FloatField(default=0.0, help_text="Weight of the item in kg")
    brand = models.CharField(max_length=100, blank=True, default='')
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    eco_impact = models.FloatField(default=0.0, help_text="CO2 saved in kg")
    is_negotiable = models.BooleanField(default=False)

    # Condition flags
    is_fully_functional = models.BooleanField(default=True)
    has_scratches = models.BooleanField(default=False)
    has_dents_cracks = models.BooleanField(default=False)
    has_original_box = models.BooleanField(default=False)
    has_receipt = models.BooleanField(default=False)

    # Additional quality indicators
    is_clean = models.BooleanField(default=True, help_text="Item is free of stains, dust, or odors")
    has_all_accessories = models.BooleanField(default=True, help_text="Includes all original chargers, cables, or parts")
    has_repair_history = models.BooleanField(default=False, help_text="Item has been repaired before")
    battery_health_good = models.BooleanField(default=True, help_text="Battery lasts a reasonable time (if applicable)")
    is_modified = models.BooleanField(default=False, help_text="Item has been customized or altered from original state")

    calculated_grade = models.CharField(max_length=1, choices=Grade.choices, db_index=True, blank=True)
    is_sold = models.BooleanField(default=False, db_index=True)
    is_reserved = models.BooleanField(default=False, db_index=True)
    view_count = models.PositiveIntegerField(default=0)
    flaw_disclosure = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def calculate_grade(self):
        """
        Computes a letter grade for this item based on category-specific quality rules.
        Returns a Grade choice value.
        """
        score = 0
        cat_name = self.category.name if self.category else 'Others'

        # Apply specific quality rulesets based on item category.
        if cat_name == 'Tech':
            if self.is_fully_functional:
                score += 40
            if self.battery_health_good:
                score += 10
            if not self.has_repair_history:
                score += 15
            if not self.has_scratches:
                score += 15
            if self.has_all_accessories:
                score += 10
            if self.has_original_box:
                score += 10

        elif cat_name == 'Luxury':
            if self.has_receipt:
                score += 30
            if not self.has_scratches:
                score += 20
            if self.is_clean:
                score += 20
            if self.has_original_box:
                score += 15
            if self.is_fully_functional:
                score += 10
            if not self.is_modified:
                score += 5

        elif cat_name in ['Men', 'Women']:
            if not self.has_scratches:
                score += 30
            if self.is_clean:
                score += 25
            if self.is_fully_functional:
                score += 20
            if self.has_original_box:
                score += 10
            if not self.is_modified:
                score += 10
            if self.has_all_accessories:
                score += 5

        elif cat_name == 'Books':
            if self.is_fully_functional:
                score += 30
            if self.is_clean:
                score += 30
            if not self.has_scratches:
                score += 20
            if self.has_all_accessories:
                score += 10
            if self.has_original_box:
                score += 10

        elif cat_name == 'Home & Living':
            if not self.has_dents_cracks:
                score += 30
            if self.is_fully_functional:
                score += 25
            if self.is_clean:
                score += 20
            if not self.has_scratches:
                score += 15
            if self.has_all_accessories:
                score += 10

        else:
            if self.is_fully_functional:
                score += 30
            if self.is_clean:
                score += 20
            if not self.has_scratches:
                score += 15
            if not self.has_dents_cracks:
                score += 15
            if self.has_original_box:
                score += 10
            if self.has_all_accessories:
                score += 10

        # Map cumulative score thresholds to standardized letter grades.
        if score >= 90:
            return self.Grade.A
        if score >= 70:
            return self.Grade.B
        if score >= 50:
            return self.Grade.C
        return self.Grade.D

    def save(self, *args, **kwargs):
        self.calculated_grade = self.calculate_grade()

        # Compute environmental impact based on item weight (estimating CO2 savings).
        if self.weight > 0:
            self.eco_impact = float(self.weight) * 2.5

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.get_calculated_grade_display()}"


class ItemImage(models.Model):

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='items/')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.image:
            compress_image(self.image)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.item.name} (pk={self.pk})"


class Notification(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    related_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification({self.user_id}, '{self.title}', read={self.is_read})"


class Transaction(models.Model):

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        PAID = 'PAID', 'Paid'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentMethod(models.TextChoices):
        STRIPE = 'STRIPE', 'Stripe Payment'

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')

    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.STRIPE,
    )

    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def effective_price(self):
        """Resolves the transaction price to use: offer price, final price, or item base price."""
        if self.offer_price is not None:
            return self.offer_price
        if self.final_price is not None:
            return self.final_price
        return self.item.price

    def __str__(self):
        return f"Transaction({self.pk}, item={self.item_id}, status={self.status})"


class Message(models.Model):

    OFFER_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')

    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False, db_index=True)

    is_offer = models.BooleanField(default=False)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    offer_status = models.CharField(
        max_length=20,
        choices=OFFER_STATUS_CHOICES,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Message({self.pk}, {self.sender_id}->{self.receiver_id})"


class ScamReport(models.Model):

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

    def __str__(self):
        return f"ScamReport({self.pk}, reporter={self.reporter_id}, status={self.status})"


class Review(models.Model):

    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')

    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review({self.pk}, rating={self.rating}, item={self.item_id})"


class Favorite(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'item')
        ordering = ['-created_at']

    def __str__(self):
        return f"Favorite(user={self.user_id}, item={self.item_id})"


class Bundle(models.Model):

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bundles')
    name = models.CharField(max_length=255, db_index=True)
    items = models.ManyToManyField(Item, related_name='bundles')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - RM {self.price}"


class PriceAlert(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_alerts')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='price_alerts')
    target_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'item')
        ordering = ['-created_at']

    def __str__(self):
        return f"PriceAlert by {self.user.username} for {self.item.name} at RM {self.target_price}"


class Block(models.Model):

    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocking')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"
