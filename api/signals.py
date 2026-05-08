from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Transaction, Review

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a Profile when a new User is registered."""
    if created:
        Profile.objects.get_or_create(user=instance)

@receiver(post_save, sender=Transaction)
def update_trust_on_transaction(sender, instance, **kwargs):
    """Update seller's trust score when a transaction is completed."""
    if instance.status == 'COMPLETED':
        instance.seller.profile.recalculate_trust_score()

@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    """Update seller's trust score when a new review is received."""
    instance.seller.profile.recalculate_trust_score()

@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, update_fields, **kwargs):
    """Update trust score if verification status changes."""
    # We use a flag to prevent infinite recursion since recalculate_trust_score() calls save()
    if update_fields and 'is_verified' in update_fields:
        instance.recalculate_trust_score()
