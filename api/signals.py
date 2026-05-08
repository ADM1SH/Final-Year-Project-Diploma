from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Transaction, Message, Notification, Review

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a Profile when a new User is registered."""
    if created:
        Profile.objects.get_or_create(user=instance)
        Notification.objects.create(
            user=instance,
            title="Welcome to MyPreLove!",
            content="Start buying and selling with trust."
        )

@receiver(post_save, sender=Transaction)
def update_trust_and_notify(sender, instance, created, **kwargs):
    """Update trust score and notify users on transaction events."""
    if created:
        Notification.objects.create(
            user=instance.seller,
            title="New Interest!",
            content=f"Someone is interested in your item: {instance.item.name}"
        )
    
    if instance.status == 'COMPLETED':
        instance.seller.profile.recalculate_trust_score()
        Notification.objects.create(
            user=instance.seller,
            title="Sale Completed!",
            content=f"Your item {instance.item.name} has been sold successfully. Your trust score has improved!"
        )
        Notification.objects.create(
            user=instance.buyer,
            title="Purchase Successful!",
            content=f"You have successfully purchased {instance.item.name}."
        )

@receiver(post_save, sender=Message)
def notify_on_message(sender, instance, created, **kwargs):
    """Notify the receiver when a new message is sent."""
    if created:
        Notification.objects.create(
            user=instance.receiver,
            title="New Message",
            content=f"You have a new message from {instance.sender.username}."
        )

@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    """Update seller's trust score when a new review is received."""
    instance.seller.profile.recalculate_trust_score()
    Notification.objects.create(
        user=instance.seller,
        title="New Review Received",
        content=f"You received a {instance.rating}-star review for {instance.item.name}."
    )

@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, **kwargs):
    """Update trust score if verification status changes."""
    # Recalculate if verified status changed (this is a simplified check)
    if instance.is_verified:
        # We use a flag to prevent infinite recursion if needed, 
        # but here recalculate_trust_score saves itself. 
        # To be safe, we can check a value or just call it if score is 0.
        instance.recalculate_trust_score()
