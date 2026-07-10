"""
Handles messaging endpoints, in-chat bargaining actions (accept, decline, counter offers),
and notification read states or admin broadcasts.
"""
# --- stdlib ---
import logging

# --- django ---
from django.contrib.auth.models import User
from django.db import transaction as db_transaction
from django.db.models import Q

# --- third-party ---
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response

# --- local ---
from ..models import Message, Notification, Transaction
from ..serializers import MessageSerializer, NotificationSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# MessageViewSet
# ---------------------------------------------------------------------------

class MessageViewSet(viewsets.ModelViewSet):
    """Viewset to manage messages and negotiations between users."""

    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Messages are immutable after creation (no edit, no delete).
    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Messages cannot be edited.")

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Messages cannot be edited.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Messages cannot be deleted.")

    def get_queryset(self):
        """
        Expose all messages to admins, but restrict standard users to conversations
        they participate in.  Filters by optional 'partner' query param.
        """
        user = self.request.user

        if user.is_superuser:
            queryset = Message.objects.all()
        else:
            queryset = Message.objects.filter(Q(sender=user) | Q(receiver=user))

        queryset = queryset.select_related(
            'sender', 'receiver', 'item__category',
        ).prefetch_related('item__images')

        # Filter messages by partner username if specified.
        partner_name = self.request.query_params.get('partner')
        if partner_name:
            queryset = queryset.filter(
                Q(sender__username=partner_name) | Q(receiver__username=partner_name)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------

    @action(detail=False, methods=['post'])
    def mark_conversation_read(self, request):
        """Marks all messages within a specific conversation as read."""
        partner_name = request.data.get('partner')
        if not partner_name:
            return Response({'error': 'Partner name required'}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.filter(
            receiver=request.user,
            sender__username=partner_name,
            is_read=False,
        ).update(is_read=True)

        return Response({'status': 'messages marked as read'})

    # NOTE: The mobile app drives offer accept/decline through
    # TransactionViewSet.partial_update (PATCH /transactions/{id}/ with
    # {"status": "ACCEPTED"|"CANCELLED"}) — that updates Transaction.status, which
    # in turn (via the post_save signal) rewrites this chat message's embedded
    # "[OFFER:id:price:status]" content string that the chat UI actually reads.
    # accept_offer/decline_offer below operate on Message.offer_status directly
    # (kept for API completeness / test coverage) but are NOT wired into the
    # mobile UI, so they do not affect the Transaction or the message content string.
    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """Accept a pending negotiation offer (receiver only)."""
        message = self.get_object()

        if not message.is_offer or message.offer_status != 'PENDING':
            return Response({'error': 'Not a pending offer'}, status=status.HTTP_400_BAD_REQUEST)

        if message.receiver != request.user:
            return Response(
                {'error': 'Only the receiver can accept the offer'},
                status=status.HTTP_403_FORBIDDEN,
            )

        Message.objects.filter(pk=message.pk).update(offer_status='ACCEPTED')
        return Response({'status': 'offer accepted', 'offer_status': 'ACCEPTED'})

    @action(detail=True, methods=['post'])
    def decline_offer(self, request, pk=None):
        """Decline a pending negotiation offer (receiver only)."""
        message = self.get_object()

        if not message.is_offer or message.offer_status != 'PENDING':
            return Response({'error': 'Not a pending offer'}, status=status.HTTP_400_BAD_REQUEST)

        if message.receiver != request.user:
            return Response(
                {'error': 'Only the receiver can decline the offer'},
                status=status.HTTP_403_FORBIDDEN,
            )

        Message.objects.filter(pk=message.pk).update(offer_status='DECLINED')
        return Response({'status': 'offer declined', 'offer_status': 'DECLINED'})

    @action(detail=True, methods=['post'])
    def counter_offer(self, request, pk=None):
        """
        Creates a counter-offer by cancelling the previous pending transaction
        and instantiating a new one with the counter price.

        The offer message format is: [OFFER:<tx_id>:<price>:<status>]
        """
        original_message = self.get_object()
        content = original_message.content or ""

        if not content.startswith('[OFFER:'):
            return Response({'error': 'Original message is not an offer'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse transaction ID from the formatted message string.
        try:
            parts = content[7:-1].split(':')
            transaction_id = int(parts[0])
        except (ValueError, IndexError):
            return Response({'error': 'Malformed offer message format'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            original_tx = Transaction.objects.select_related('item', 'buyer', 'seller').get(pk=transaction_id)
        except Transaction.DoesNotExist:
            return Response({'error': 'Original transaction does not exist'}, status=status.HTTP_404_NOT_FOUND)

        if original_tx.status == Transaction.Status.COMPLETED:
            return Response({'error': 'Cannot counter a completed transaction'}, status=status.HTTP_400_BAD_REQUEST)

        counter_price_raw = request.data.get('price')
        if not counter_price_raw:
            return Response({'error': 'Counter offer price is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            counter_price = float(counter_price_raw)
            if counter_price <= 0:
                raise ValueError("Counter price must be positive.")
        except (TypeError, ValueError):
            return Response({'error': 'Invalid price format'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user not in (original_message.sender, original_message.receiver):
            return Response(
                {'error': 'You are not a participant in this conversation'},
                status=status.HTTP_403_FORBIDDEN,
            )

        with db_transaction.atomic():
            # Cancel the original pending transaction.
            if original_tx.status == Transaction.Status.PENDING:
                Transaction.objects.filter(pk=original_tx.pk).update(status=Transaction.Status.CANCELLED)

            # Create the new counter-offer transaction.
            new_tx = Transaction.objects.create(
                item=original_tx.item,
                buyer=original_tx.buyer,
                seller=original_tx.seller,
                offer_price=counter_price,
                final_price=counter_price,
                payment_method=original_tx.payment_method,
                status=Transaction.Status.PENDING,
            )

        # Locate the auto-generated offer message linked to the new transaction.
        counter_msg = Message.objects.filter(
            item=new_tx.item,
            content__startswith=f"[OFFER:{new_tx.id}:",
        ).first()

        if not counter_msg:
            logger.error(
                "Counter offer message not auto-generated for Transaction pk=%s", new_tx.pk
            )
            return Response(
                {'error': 'Counter offer message could not be generated'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Adjust the message sender/receiver to reflect who sent the counter-offer.
        counter_msg.sender = user
        counter_msg.receiver = original_tx.seller if user == original_tx.buyer else original_tx.buyer
        counter_msg.save(update_fields=['sender', 'receiver'])

        serializer = self.get_serializer(counter_msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# NotificationViewSet
# ---------------------------------------------------------------------------

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Viewset to view notifications, mark them as read, or broadcast announcements."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def broadcast(self, request):
        """Admin broadcast endpoint to issue site-wide notifications."""
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title', '').strip()
        content = request.data.get('content', '').strip()

        if not title or not content:
            return Response({'error': 'Title and content required'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch only the IDs needed — avoid loading full User objects into memory.
        user_ids = list(User.objects.values_list('id', flat=True))

        Notification.objects.bulk_create([
            Notification(user_id=uid, title=title, content=content)
            for uid in user_ids
        ])

        return Response({'status': f'Broadcast sent to {len(user_ids)} users.'})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marks a single notification as read without fetching the full object."""
        notification = self.get_object()
        # Use targeted UPDATE to avoid a full model save.
        Notification.objects.filter(pk=notification.pk).update(is_read=True)
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Bulk-marks all unread notifications for the active user as read."""
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})
