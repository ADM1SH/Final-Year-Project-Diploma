# signals.py
# Automated triggers for MyPreLove.
# This file responds to database changes with notifications and trust score updates.

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Transaction, Message, Notification, Review

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    # Create profiles for new users. 
    # Send welcome alerts automatically.
    if created:
        Profile.objects.get_or_create(user=instance)
        Notification.objects.create(
            user=instance,
            title="Welcome to MyPreLove!",
            content="Start buying and selling with trust."
        )

@receiver(post_save, sender=Transaction)
def update_trust_and_notify(sender, instance, created, **kwargs):
    # Manage alerts for transactions. 
    # Recalculate trust scores upon completion.
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
            content=f"Your item {instance.item.name} has been sold successfully."
        )
        Notification.objects.create(
            user=instance.buyer,
            title="Purchase Successful!",
            content=f"You have successfully purchased {instance.item.name}."
        )

@receiver(post_save, sender=Message)
def notify_on_message(sender, instance, created, **kwargs):
    # Notify receivers of new chat messages.
    if created:
        Notification.objects.create(
            user=instance.receiver,
            title="New Message",
            content=f"You have a new message from {instance.sender.username}."
        )

@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    # Update seller trust scores after buyer feedback.
    instance.seller.profile.recalculate_trust_score()
    Notification.objects.create(
        user=instance.seller,
        title="New Review Received",
        content=f"You received a {instance.rating}-star review for {instance.item.name}."
    )

@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, **kwargs):
    # Recalculate trust scores when verification status changes.
    if instance.is_verified:
        instance.recalculate_trust_score()
