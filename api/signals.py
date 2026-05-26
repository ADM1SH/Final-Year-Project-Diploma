# signals.py
# Automated triggers for MyPreLove.
# This file responds to database changes with notifications and trust score updates.

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, Transaction, Message, Notification, Review, Favorite, Item

@receiver(post_save, sender=Favorite)
def notify_on_favorite(sender, instance, created, **kwargs):
    # Notify sellers when their item is favorited.
    if created:
        Notification.objects.create(
            user=instance.item.seller,
            title="New Favorite!",
            content=f"Someone liked your {instance.item.name}."
        )

@receiver(post_save, sender=Item)
def notify_on_listing(sender, instance, created, **kwargs):
    # System alert when a new listing is created.
    if created:
        Notification.objects.create(
            user=instance.seller,
            title="Listing Live!",
            content=f"Your {instance.name} is now visible to buyers.",
            related_id=instance.id
        )

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
            content=f"Someone is interested in your item: {instance.item.name}",
            related_id=instance.item.id
        )
        # Create a system chat message with [OFFER:id:price:status]
        price = instance.offer_price if instance.offer_price is not None else (instance.final_price if instance.final_price is not None else instance.item.price)
        formatted_price = f"{float(price):.2f}"
        Message.objects.create(
            sender=instance.buyer,
            receiver=instance.seller,
            item=instance.item,
            content=f"[OFFER:{instance.id}:{formatted_price}:PENDING]"
        )
    else:
        # Find structural message if exists and sync its status
        msg = Message.objects.filter(
            sender=instance.buyer,
            receiver=instance.seller,
            item=instance.item,
            content__startswith=f"[OFFER:{instance.id}:"
        ).first()
        if msg:
            price = instance.offer_price if instance.offer_price is not None else (instance.final_price if instance.final_price is not None else instance.item.price)
            formatted_price = f"{float(price):.2f}"
            msg.content = f"[OFFER:{instance.id}:{formatted_price}:{instance.status}]"
            msg.save()
    
    if instance.status == 'COMPLETED':
        # Mark item as sold
        instance.item.is_sold = True
        instance.item.save()

        # Recalculate trust score
        instance.seller.profile.recalculate_trust_score()

        amount = instance.final_price

        # Isolate wallet deductions to WALLET payment method only
        if instance.payment_method == 'WALLET':
            buyer_profile = instance.buyer.profile
            seller_profile = instance.seller.profile

            buyer_profile.wallet_balance -= amount
            seller_profile.wallet_balance += amount

            # Save profiles avoiding signals triggering recursive loops
            Profile.objects.filter(pk=buyer_profile.pk).update(wallet_balance=buyer_profile.wallet_balance)
            Profile.objects.filter(pk=seller_profile.pk).update(wallet_balance=seller_profile.wallet_balance)

            # Log audit trail records
            from .models import WalletTransaction
            WalletTransaction.objects.create(
                user=instance.buyer,
                amount=amount,
                tx_type='PURCHASE',
                description=f"Purchased: {instance.item.name}"
            )
            WalletTransaction.objects.create(
                user=instance.seller,
                amount=amount,
                tx_type='SALE',
                description=f"Sold: {instance.item.name}"
            )

            Notification.objects.create(
                user=instance.seller,
                title="Sale Completed!",
                content=f"Your item {instance.item.name} has been sold successfully. RM {amount:.2f} credited to your wallet.",
                related_id=instance.item.id
            )
            Notification.objects.create(
                user=instance.buyer,
                title="Purchase Successful!",
                content=f"You have successfully purchased {instance.item.name}. RM {amount:.2f} deducted from your wallet.",
                related_id=instance.item.id
            )
        else:
            # For CASH or other payments, send completion notifications without altering wallet balances
            Notification.objects.create(
                user=instance.seller,
                title="Sale Completed!",
                content=f"Your item {instance.item.name} has been sold successfully via {instance.get_payment_method_display()}.",
                related_id=instance.item.id
            )
            Notification.objects.create(
                user=instance.buyer,
                title="Purchase Successful!",
                content=f"You have successfully purchased {instance.item.name} via {instance.get_payment_method_display()}.",
                related_id=instance.item.id
            )


@receiver(post_save, sender=Message)
def notify_on_message(sender, instance, created, **kwargs):
    # Notify receivers of new chat messages.
    if created:
        Notification.objects.create(
            user=instance.receiver,
            title="New Message",
            content=f"You have a new message from {instance.sender.username}.",
            related_id=instance.sender.id
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
    instance.recalculate_trust_score()
