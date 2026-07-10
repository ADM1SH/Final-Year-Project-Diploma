"""
Implements Django signal receivers that orchestrate side-effects,
such as sending notifications and updating trust scores.

DESIGN NOTES
------------
* Signals are intentionally kept thin — they must NEVER raise exceptions that
  abort the triggering transaction silently.
* Every cross-model write in update_trust_and_notify() uses select_for_update()
  to prevent race conditions when two COMPLETED saves happen concurrently.
* The Profile post_save receiver guards against infinite loops by checking
  update_fields — recalculate_trust_score() uses .update() which re-triggers
  post_save but with update_fields=['trust_score'], so the guard returns early.
"""
# --- stdlib ---
import logging

# --- django ---
from django.contrib.auth.models import User
from django.db import transaction as db_transaction
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

# --- local ---
from .models import (
    Favorite, Item, Message, Notification,
    PriceAlert, Profile, Review, Transaction,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# User / Profile signals
# ---------------------------------------------------------------------------

@receiver(pre_delete, sender=User)
def purge_jwt_tokens_before_user_delete(sender, instance, **kwargs):
    """
    Deletes this user's OutstandingToken rows (and their cascaded BlacklistedToken
    rows) before the User row itself is deleted.
    Needed because the actual SQLite table for token_blacklist_outstandingtoken
    was created with a raw 'NO ACTION' foreign-key constraint on user_id, which
    diverges from the Python-level on_delete=SET_NULL declared upstream in
    simplejwt's model — a known Django/SQLite drift where changing on_delete
    doesn't always rewrite the underlying DDL. Without this, deleting a user
    (from the admin panel or DELETE /api/users/{id}/) raises
    'FOREIGN KEY constraint failed'.
    """
    OutstandingToken.objects.filter(user=instance).delete()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Creates a Profile and welcome notification when a new User is registered."""
    if not created:
        return

    Profile.objects.get_or_create(user=instance)

    Notification.objects.create(
        user=instance,
        title="Welcome to MyPreLove!",
        content="Start buying and selling with trust.",
    )


@receiver(post_save, sender=Profile)
def update_trust_on_verification(sender, instance, created, **kwargs):
    """
    Recalculates the trust score when is_verified changes.
    Guards against the infinite loop: recalculate_trust_score() calls
    Profile.objects.filter(pk=...).update(trust_score=...) which also fires
    post_save with update_fields=['trust_score'] — the guard below returns
    early in that case so we never loop.
    """
    update_fields = kwargs.get('update_fields')

    # If update_fields is set and does NOT include is_verified, bail out.
    # This is the guard that prevents the infinite recalculation loop.
    if update_fields is not None and 'is_verified' not in update_fields:
        return

    # On full save (update_fields is None) or when is_verified is being saved,
    # recalculate. Note: recalculate_trust_score() uses .update() internally,
    # so the resulting post_save has update_fields set and will hit the guard above.
    instance.recalculate_trust_score()


# ---------------------------------------------------------------------------
# Item signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Item)
def notify_on_listing(sender, instance, created, **kwargs):
    """Notifies the seller that their listing is now live."""
    if created:
        Notification.objects.create(
            user=instance.seller,
            title="Listing Live!",
            content=f"Your {instance.name} is now visible to buyers.",
            related_id=instance.id,
        )


@receiver(post_save, sender=Item)
def notify_on_price_drop(sender, instance, created, **kwargs):
    """
    Fires price-drop notifications and deletes consumed alerts when an item price
    drops to or below a user's alert threshold.
    Uses bulk_create to avoid N+1 inserts when many users have alerts.
    """
    if created:
        return

    # Fetch all matching alerts with their users in one query.
    alerts = list(
        PriceAlert.objects.filter(
            item=instance,
            target_price__gte=instance.price,
        ).select_related('user')
    )

    if not alerts:
        return

    # Bulk-create notifications in a single round-trip.
    Notification.objects.bulk_create([
        Notification(
            user=alert.user,
            title="Price Drop Alert! 📉",
            content=(
                f"Good news! The price of '{instance.name}' has dropped to "
                f"RM {instance.price:.2f} (your alert threshold was RM {alert.target_price:.2f})."
            ),
            related_id=instance.id,
        )
        for alert in alerts
    ])

    # Delete all triggered alerts in a single DELETE query.
    PriceAlert.objects.filter(pk__in=[a.pk for a in alerts]).delete()


# ---------------------------------------------------------------------------
# Favorite signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Favorite)
def notify_on_favorite(sender, instance, created, **kwargs):
    """Notifies the item seller when someone favorites their listing."""
    if not created:
        return

    Notification.objects.create(
        user=instance.item.seller,
        title="New Favorite!",
        content=f"Someone liked your {instance.item.name}.",
    )


# ---------------------------------------------------------------------------
# Transaction signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Transaction)
def update_trust_and_notify(sender, instance, created, **kwargs):
    """
    Orchestrates post-save side-effects for a Transaction:

    On CREATE:
      - Notifies seller of the new offer.
      - Creates the chat-system offer message.

    On UPDATE:
      - Syncs the chat offer message with the current status/price.

    Always:
      - Keeps item.is_reserved in sync with pending transaction state.

    On COMPLETED (first time only, guarded by locked_item.is_sold):
      - Sends completion notifications to both parties.
      - Marks item as sold.
      - Recalculates seller trust score.
    """
    _sync_item_reservation(instance)

    if created:
        _handle_new_transaction(instance)
    else:
        _sync_offer_message(instance)

    if instance.status == Transaction.Status.COMPLETED:
        _handle_completion(instance)


def _handle_new_transaction(instance):
    """Side-effects for a freshly created transaction."""
    Notification.objects.create(
        user=instance.seller,
        title="New Interest!",
        content=f"Someone is interested in your item: {instance.item.name}",
        related_id=instance.item.id,
    )

    price = instance.effective_price
    formatted_price = f"{float(price):.2f}"

    Message.objects.create(
        sender=instance.buyer,
        receiver=instance.seller,
        item=instance.item,
        content=f"[OFFER:{instance.id}:{formatted_price}:PENDING]",
    )


def _sync_offer_message(instance):
    """
    Updates the chat offer message to reflect the current transaction status/price.
    Matches only on item + the transaction's embedded id in the content prefix —
    NOT on sender/receiver, because counter_offer() (see messaging_views.py) can flip
    the message's sender/receiver to whichever party proposed the latest counter-price.
    """
    msg = Message.objects.filter(
        item=instance.item,
        content__startswith=f"[OFFER:{instance.id}:",
    ).first()

    if msg:
        price = instance.effective_price
        formatted_price = f"{float(price):.2f}"
        msg.content = f"[OFFER:{instance.id}:{formatted_price}:{instance.status}]"
        msg.save(update_fields=['content'])


def _sync_item_reservation(instance):
    """Keeps item.is_reserved in sync with whether any PENDING transaction exists."""
    has_pending = Transaction.objects.filter(
        item=instance.item,
        status=Transaction.Status.PENDING,
    ).exists()
    if instance.item.is_reserved != has_pending:
        Item.objects.filter(pk=instance.item_id).update(is_reserved=has_pending)
        # Keep the in-memory instance consistent to avoid stale reads in the same request.
        instance.item.is_reserved = has_pending


def _handle_completion(instance):
    """
    Atomically finalizes a completed transaction:
    - Locks the item with select_for_update() to prevent concurrent double-sells.
    - Guards against double-completion via locked_item.is_sold.
    - Notifies both buyer and seller, then marks the item as sold.
    """
    from rest_framework.exceptions import ValidationError

    with db_transaction.atomic():
        # Row-level lock on the item to prevent concurrent double-sells.
        locked_item = Item.objects.select_for_update().get(pk=instance.item_id)

        if locked_item.is_sold:
            # Item was sold by a concurrent transaction — revert this one.
            Transaction.objects.filter(pk=instance.pk).update(status=Transaction.Status.CANCELLED)
            raise ValidationError({"status": "Item has already been sold."})

        method_display = instance.get_payment_method_display()

        Notification.objects.bulk_create([
            Notification(
                user=instance.seller,
                title="Sale Completed!",
                content=f"Your item {instance.item.name} has been sold successfully via {method_display}.",
                related_id=instance.item_id,
            ),
            Notification(
                user=instance.buyer,
                title="Purchase Successful!",
                content=f"You have successfully purchased {instance.item.name} via {method_display}.",
                related_id=instance.item_id,
            ),
        ])

        # Mark the item as sold AFTER all financial operations succeed.
        Item.objects.filter(pk=locked_item.pk).update(is_sold=True)
        locked_item.is_sold = True

    # Recalculate trust score OUTSIDE the atomic block to avoid holding the lock
    # during the additional aggregation queries.
    try:
        seller_profile = Profile.objects.get(user_id=instance.seller_id)
        seller_profile.recalculate_trust_score()
    except Profile.DoesNotExist:
        logger.warning("Could not recalculate trust score: profile missing for seller pk=%s", instance.seller_id)


# ---------------------------------------------------------------------------
# Message signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Message)
def notify_on_message(sender, instance, created, **kwargs):
    """Notifies the receiver of a new message."""
    if not created:
        return

    Notification.objects.create(
        user=instance.receiver,
        title="New Message",
        content=f"You have a new message from {instance.sender.username}.",
        related_id=instance.sender_id,
    )


# ---------------------------------------------------------------------------
# Review signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Review)
def update_trust_on_review(sender, instance, **kwargs):
    """Recalculates seller trust score and notifies them of a new review."""
    try:
        instance.seller.profile.recalculate_trust_score()
    except Profile.DoesNotExist:
        logger.warning("Could not recalculate trust score: profile missing for seller pk=%s", instance.seller_id)

    Notification.objects.create(
        user=instance.seller,
        title="New Review Received",
        content=f"You received a {instance.rating}-star review for {instance.item.name}.",
    )
