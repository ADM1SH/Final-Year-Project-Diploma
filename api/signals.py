# =====================================================================
# SYSTEM/PROJECT NAME: MyPreLove (Secondhand Eco-Marketplace Mobile App)
# COURSE: Diploma in Information Technology (DIT)
# MODULE: Final Year Project (FYP) - DIT3004 / DIT3102
# MEMBERS: Adam Anwar & FYP Group
# FILE NAME: signals.py
# PURPOSE: Django signal receivers that trigger automated backend flows,
#          such as profile creation, welcome alerts, trust score
#          recalculations, in-chat bargaining offer message syncs, etc.
# =====================================================================

# Pull in the signal infrastructure and the auth User model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

# Import every model that either fires signals or gets touched inside them
from .models import Profile, Transaction, Message, Notification, Review, Favorite, Item, PriceAlert


# ── FAVORITE SIGNAL ──────────────────────────────────────────────────────────

# Fire this handler every time a Favorite record is saved
@receiver(post_save, sender=Favorite)
def notify_on_favorite(sender, instance, created, **kwargs):
    # Notify sellers when their item is favorited.
    # Only act on brand-new favourites — ignore any updates to existing ones
    if created:
        # Tell the seller someone found their item interesting enough to heart
        Notification.objects.create(
            user=instance.item.seller,  # push to the seller, not the buyer who clicked ❤
            title="New Favorite!",
            content=f"Someone liked your {instance.item.name}."
        )


# ── NEW LISTING SIGNAL ───────────────────────────────────────────────────────

# Listen for any Item save, but we only care about newly created listings here
@receiver(post_save, sender=Item)
def notify_on_listing(sender, instance, created, **kwargs):
    # System alert when a new listing is created.
    # Skip this if the seller is just editing an existing item
    if created:
        # Confirm to the seller that their listing is live and visible to buyers
        Notification.objects.create(
            user=instance.seller,
            title="Listing Live!",
            content=f"Your {instance.name} is now visible to buyers.",
            related_id=instance.id  # deep-link the notification straight to this item
        )


# ── USER REGISTRATION SIGNAL ─────────────────────────────────────────────────

# Fires every time a Django User is saved — we gate on `created` so it only runs once
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    # Create profiles for new users. 
    # Send welcome alerts automatically.
    # Only run setup logic for genuinely new accounts, not profile edits
    if created:
        # get_or_create is a safety net — ensures we never accidentally create duplicate profiles
        Profile.objects.get_or_create(user=instance)

        # Drop a welcome notification into the new user's inbox straight away
        Notification.objects.create(
            user=instance,
            title="Welcome to MyPreLove!",
            content="Start buying and selling with trust."
        )


# ── TRANSACTION SIGNAL ───────────────────────────────────────────────────────

# This is the busiest signal in the project — it handles offer creation,
# offer status syncing, item locking, wallet transfers, and sale notifications
@receiver(post_save, sender=Transaction)
def update_trust_and_notify(sender, instance, created, **kwargs):
    # Manage alerts for transactions. 
    # Recalculate trust scores upon completion.

    # ── Branch A: a brand-new transaction/offer just came in ─────────────────
    if created:
        # Ping the seller so they know someone is actively interested in their item
        Notification.objects.create(
            user=instance.seller,
            title="New Interest!",
            content=f"Someone is interested in your item: {instance.item.name}",
            related_id=instance.item.id
        )

        # Create a system chat message with [OFFER:id:price:status]
        # Resolve the price to show in the chat bubble — prefer offer_price, then final_price, then the item's listed price
        price = instance.offer_price if instance.offer_price is not None else (instance.final_price if instance.final_price is not None else instance.item.price)

        # Format to exactly 2 decimal places so the chat parser can reliably split on ":"
        formatted_price = f"{float(price):.2f}"

        # Inject a machine-readable offer pill into the chat thread so the mobile app can render it as a card
        Message.objects.create(
            sender=instance.buyer,
            receiver=instance.seller,
            item=instance.item,
            content=f"[OFFER:{instance.id}:{formatted_price}:PENDING]"  # status starts as PENDING
        )

    # ── Branch B: an existing transaction was updated (e.g. accepted/rejected) ─
    else:
        # Find structural message if exists and sync its status
        # Look up the original offer pill message we injected when the transaction was first created
        msg = Message.objects.filter(
            sender=instance.buyer,
            receiver=instance.seller,
            item=instance.item,
            content__startswith=f"[OFFER:{instance.id}:"  # match by transaction ID prefix
        ).first()

        # If we found the chat bubble, rewrite it to reflect the new status (ACCEPTED / REJECTED / etc.)
        if msg:
            # Recalculate the price again in case it was renegotiated
            price = instance.offer_price if instance.offer_price is not None else (instance.final_price if instance.final_price is not None else instance.item.price)
            formatted_price = f"{float(price):.2f}"

            # Overwrite the content string in-place so the chat card re-renders with the correct state
            msg.content = f"[OFFER:{instance.id}:{formatted_price}:{instance.status}]"
            msg.save()

    # ── COMPLETED status block — runs for both created and updated saves ───────
    # Only proceed with the heavy lifting once the deal is actually sealed
    if instance.status == 'COMPLETED':

        # ── Atomic item lock ──────────────────────────────────────────────────
        # Mark item as sold with atomic select_for_update lock to prevent duplicate sale race conditions
        # Import here to keep the top-level imports clean and avoid circular dependency issues
        from django.db import transaction as db_transaction

        # Wrap the item update in a database transaction so two simultaneous buyers can't both complete a sale
        with db_transaction.atomic():
            # Lock this specific item row in the DB until the transaction block finishes
            locked_item = Item.objects.select_for_update().get(pk=instance.item.pk)

            # Double-check it hasn't already been marked sold by a concurrent request
            if not locked_item.is_sold:
                # We do all the heavy lifting ONLY if the item wasn't already sold

                # Grab the agreed final price that we'll use for wallet maths and notification copy
                amount = instance.final_price

                # ── Wallet payment path ───────────────────────────────────────────────
                # Isolate wallet deductions to WALLET payment method only
                if instance.payment_method == 'WALLET':
                    # Lock the buyer's profile to prevent a concurrent multi-item purchase from dropping wallet below 0
                    buyer_profile = Profile.objects.select_for_update().get(pk=instance.buyer.profile.pk)
                    seller_profile = Profile.objects.select_for_update().get(pk=instance.seller.profile.pk)
                    
                    if buyer_profile.wallet_balance < amount:
                        # Transaction fails due to insufficient funds mid-race condition
                        from rest_framework.exceptions import ValidationError
                        # Revert the transaction to PENDING so it doesn't stay COMPLETED
                        Transaction.objects.filter(pk=instance.pk).update(status='PENDING')
                        raise ValidationError({"status": "Insufficient wallet balance to complete this transaction. Please top up."})

                    # Subtract the sale amount from the buyer's wallet balance
                    buyer_profile.wallet_balance -= amount
                    # Credit the same amount into the seller's wallet balance
                    seller_profile.wallet_balance += amount

                    # Save profiles avoiding signals triggering recursive loops
                    Profile.objects.filter(pk=buyer_profile.pk).update(wallet_balance=buyer_profile.wallet_balance)
                    Profile.objects.filter(pk=seller_profile.pk).update(wallet_balance=seller_profile.wallet_balance)

                    # Log audit trail records
                    from .models import WalletTransaction

                    # Record a debit entry for the buyer's transaction history
                    WalletTransaction.objects.create(
                        user=instance.buyer,
                        amount=amount,
                        tx_type='PURCHASE',
                        description=f"Purchased: {instance.item.name}"
                    )

                    # Record a credit entry for the seller's transaction history
                    WalletTransaction.objects.create(
                        user=instance.seller,
                        amount=amount,
                        tx_type='SALE',
                        description=f"Sold: {instance.item.name}"
                    )

                    # Tell the seller their money has landed in their wallet
                    Notification.objects.create(
                        user=instance.seller,
                        title="Sale Completed!",
                        content=f"Your item {instance.item.name} has been sold successfully. RM {amount:.2f} credited to your wallet.",
                        related_id=instance.item.id  # deep-link so the seller can view the item straight from the notification
                    )

                    # Confirm the purchase to the buyer and show exactly how much was taken out
                    Notification.objects.create(
                        user=instance.buyer,
                        title="Purchase Successful!",
                        content=f"You have successfully purchased {instance.item.name}. RM {amount:.2f} deducted from your wallet.",
                        related_id=instance.item.id
                    )

                # ── Cash / other payment path ─────────────────────────────────────────
                else:
                    # For CASH or other payments, send completion notifications without altering wallet balances
                    # No money moves in the app — just confirm the deal happened for record-keeping
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

                # Finally, commit the item status
                locked_item.is_sold = True
                locked_item.save(update_fields=['is_sold'])

                # Bump the seller's ABI trust score now that they have one more completed sale under their belt
                instance.seller.profile.recalculate_trust_score()


# ── MESSAGE SIGNAL ────────────────────────────────────────────────────────────

# Trigger a notification every time a new chat message lands so the recipient knows to check their inbox
@receiver(post_save, sender=Message)
def notify_on_message(sender, instance, created, **kwargs):
    # Notify receivers of new chat messages.
    # Only fire for new messages — edits or read-status updates should stay silent
    if created:
        # Push a notification to whoever the message was sent to
        Notification.objects.create(
            user=instance.receiver,
            title="New Message",
            content=f"You have a new message from {instance.sender.username}.",
            related_id=instance.sender.id  # deep-link to the sender's profile so the receiver can jump to the chat
        )


# ── REVIEW SIGNAL ─────────────────────────────────────────────────────────────

# Every time a buyer leaves a review, the seller's trust score needs to be refreshed
@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    # Update seller trust scores after buyer feedback.
    # Recalculate immediately — Benevolence (50pts) is driven entirely by ratings so this matters a lot
    instance.seller.profile.recalculate_trust_score()

    # Let the seller know they've received feedback and what rating they got
    Notification.objects.create(
        user=instance.seller,
        title="New Review Received",
        content=f"You received a {instance.rating}-star review for {instance.item.name}."
    )


# ── PROFILE VERIFICATION SIGNAL ───────────────────────────────────────────────

# Watches for changes to Profile records — specifically the is_verified flag
@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, created, **kwargs):
    # DIPLOMA FYP COMMENT:
    # Recalculate trust scores when verification status changes or on creation.
    # We check update_fields to prevent recursive loops and redundant calculations
    # when unrelated fields (like wallet_balance or bio) are being saved!

    # Grab the list of fields that were explicitly passed to .save(update_fields=[...])
    update_fields = kwargs.get('update_fields')

    # If a specific subset of fields was saved and is_verified isn't among them,
    # bail out early — no need to waste compute on a trust recalc for a bio update
    if update_fields and 'is_verified' not in update_fields:
        return

    # Verification status did change (or a full save happened) — recalculate the ABI Integrity component
    instance.recalculate_trust_score()


# ── PRICE ALERT / PRICE DROP SIGNAL ──────────────────────────────────────────

# Second handler attached to Item — this one watches for price changes on existing listings
@receiver(post_save, sender=Item)
def notify_on_price_drop(sender, instance, created, **kwargs):
    # DIPLOMA FYP COMMENT:
    # If the item's price is updated, check if it's lower than or equal to target_price
    # for any registered PriceAlert, and notify those users.

    # Brand-new listings can't have dropped in price, so skip them entirely
    if not created:
        # Find every alert where the user's target price is >= the item's current price
        # meaning the item has now hit or beaten the price the user was waiting for
        alerts = PriceAlert.objects.filter(item=instance, target_price__gte=instance.price)

        # Go through each matching alert and notify the interested user
        for alert in alerts:
            # Fire the price drop notification with both the new price and the threshold the user set
            Notification.objects.create(
                user=alert.user,
                title="Price Drop Alert! 📉",
                content=f"Good news! The price of '{instance.name}' has dropped to RM {instance.price:.2f} (your alert threshold was RM {alert.target_price:.2f}).",
                related_id=instance.id  # deep-link to the item so the user can buy it straight from the notification
            )
            # Remove alert after firing to prevent spamming
            # One-shot alert — delete it so the user doesn't get pinged again on future price changes
            alert.delete()
