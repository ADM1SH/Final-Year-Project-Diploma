from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Transaction, Message, Notification, Review

"""
EXPLANATION: Signals are 'Automated Triggers'.
They listen for changes in the database and run code automatically.
This keeps your logic organized and centralized.
"""

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """When a new user registers, automatically create their Profile and a welcome alert."""
    if created:
        Profile.objects.get_or_create(user=instance)
        Notification.objects.create(
            user=instance,
            title="Welcome to MyPreLove!",
            content="Start buying and selling with trust."
        )

@receiver(post_save, sender=Transaction)
def update_trust_and_notify(sender, instance, created, **kwargs):
    """Triggered when a deal is started or finished."""
    # Notify the seller when someone is interested
    if created:
        Notification.objects.create(
            user=instance.seller,
            title="New Interest!",
            content=f"Someone is interested in your item: {instance.item.name}"
        )
    
    # When a sale is finished, recalculate the seller's trust score automatically
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
    """Sends a notification alert to the receiver whenever a new chat message arrives."""
    if created:
        Notification.objects.create(
            user=instance.receiver,
            title="New Message",
            content=f"You have a new message from {instance.sender.username}."
        )

@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    """Recalculate Trust Score automatically after a buyer leaves feedback."""
    instance.seller.profile.recalculate_trust_score()
    Notification.objects.create(
        user=instance.seller,
        title="New Review Received",
        content=f"You received a {instance.rating}-star review for {instance.item.name}."
    )

@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, **kwargs):
    """Triggered when an Admin verifies a user. It gives their score an immediate boost."""
    if instance.is_verified:
        # Calls the math method we wrote in models.py
        instance.recalculate_trust_score()
