"""
Handles transaction-related views including purchase validation,
Stripe payment processing (escrow → release flow), user reviews,
and fraud/scam report resolutions.
"""
# --- django ---
from django.db.models import Q

# --- third-party ---
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied
from rest_framework.response import Response

# --- local ---
from django.conf import settings
from ..models import Item, Message, Notification, Review, ScamReport, Transaction
from ..serializers import ReviewSerializer, ScamReportSerializer, TransactionSerializer
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY


# ---------------------------------------------------------------------------
# TransactionViewSet
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ModelViewSet):
    """Viewset to manage transactional exchange processes between buyers and sellers."""

    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Transactions cannot be arbitrarily modified after creation (audit trail).
    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot arbitrarily modify transactions.")

    def partial_update(self, request, *args, **kwargs):
        """Allow partial update only for the 'status' field (e.g. accepting/declining an offer)."""
        transaction = self.get_object()
        user = request.user

        # Superadmins can update any transaction field.
        if user.is_superuser:
            new_status = request.data.get('status')
            if new_status and new_status in dict(Transaction.Status.choices):
                transaction.status = new_status
                transaction.save(update_fields=['status'])
                return Response(self.get_serializer(transaction).data)
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        if user != transaction.buyer and user != transaction.seller:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if 'status' in request.data:
            new_status = request.data['status']

            if new_status not in ('ACCEPTED', 'CANCELLED'):
                return Response({'error': 'Invalid status transition.'}, status=status.HTTP_400_BAD_REQUEST)

            if new_status == 'ACCEPTED':
                # Whoever proposed the current pending price (the sender of the linked
                # offer/counter-offer chat message) cannot accept their own offer —
                # only the other party (buyer or seller, whichever is the counterparty)
                # may accept it. This correctly supports counter-offers made by either side.
                offer_message = Message.objects.filter(
                    item=transaction.item,
                    content__startswith=f"[OFFER:{transaction.id}:",
                ).first()
                proposer = offer_message.sender_id if offer_message else transaction.buyer_id

                if user.id == proposer:
                    return Response({'error': 'You cannot accept your own offer.'}, status=status.HTTP_400_BAD_REQUEST)

            transaction.status = new_status
            transaction.save(update_fields=['status'])
            return Response(self.get_serializer(transaction).data)

        raise MethodNotAllowed(request.method, detail="Can only modify status.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot delete transactions.")

    def get_queryset(self):
        """Filter transactions where the authenticated user is either the buyer or the seller.
        Superadmins see all transactions."""
        user = self.request.user
        if user.is_superuser:
            return (
                Transaction.objects.all()
                .select_related('item__category', 'buyer', 'seller')
                .prefetch_related('item__images')
                .order_by('-created_at')
            )
        return (
            Transaction.objects
            .filter(Q(buyer=user) | Q(seller=user))
            .select_related('item__category', 'buyer', 'seller')
            .prefetch_related('item__images')
            .order_by('-created_at')
        )

    def perform_create(self, serializer):
        """
        Validates transaction parameters before establishing the order.
        Uses select_for_update() to prevent a race condition where the same item
        is bought concurrently by two buyers.
        """
        from django.db import transaction as db_transaction

        item = serializer.validated_data['item']
        user = self.request.user

        # Prevent users from initiating transactions on their own listed items.
        if user == item.seller:
            raise serializers.ValidationError("You cannot buy your own item.")

        with db_transaction.atomic():
            # Lock the item row to prevent concurrent purchases.
            locked_item = Item.objects.select_for_update().get(pk=item.pk)

            if locked_item.is_sold:
                raise serializers.ValidationError("This item has already been sold.")

            if locked_item.is_reserved:
                raise serializers.ValidationError("This item is currently reserved by another buyer.")

            # Determine the final agreed-upon price (use offer price if provided).
            offer_price = serializer.validated_data.get('offer_price')
            final_price = offer_price if offer_price is not None else locked_item.price

            serializer.save(
                buyer=user,
                seller=locked_item.seller,
                final_price=final_price,
            )

    @action(detail=True, methods=['post'], url_path='create-payment-intent')
    def create_payment_intent(self, request, pk=None):
        """Creates a Stripe Payment Intent to initiate the escrow payment flow."""
        transaction = self.get_object()

        if transaction.buyer != request.user:
            return Response({'error': 'Only the buyer can initiate payment.'}, status=status.HTTP_403_FORBIDDEN)

        if transaction.status not in [Transaction.Status.PENDING, Transaction.Status.ACCEPTED]:
            return Response({'error': 'Transaction is not in a valid state for payment.'}, status=status.HTTP_400_BAD_REQUEST)

        amount_cents = int(transaction.effective_price * 100)

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='myr',
                metadata={'transaction_id': transaction.id},
            )
            transaction.stripe_payment_intent_id = intent.id
            transaction.payment_method = Transaction.PaymentMethod.STRIPE
            transaction.save(update_fields=['stripe_payment_intent_id', 'payment_method'])

            return Response({'client_secret': intent.client_secret})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[], url_path='stripe-webhook')
    def stripe_webhook(self, request):
        """Stripe webhook endpoint — updates transaction status when payment succeeds."""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event['type'] == 'payment_intent.succeeded':
            intent = event['data']['object']
            transaction_id = intent.get('metadata', {}).get('transaction_id')
            if transaction_id:
                try:
                    tx = Transaction.objects.get(id=transaction_id)
                    # Accept both PENDING and ACCEPTED as valid pre-payment states.
                    if tx.status in [Transaction.Status.PENDING, Transaction.Status.ACCEPTED]:
                        tx.status = Transaction.Status.PAID
                        tx.save(update_fields=['status'])
                        Notification.objects.bulk_create([
                            Notification(
                                user=tx.buyer,
                                title="Payment Confirmed",
                                content=f"Your payment for {tx.item.name} is confirmed. Funds are held in escrow until you receive the item.",
                            ),
                            Notification(
                                user=tx.seller,
                                title="Payment Received (Escrow)",
                                content=f"Payment for {tx.item.name} has been received. Funds will be released once the buyer confirms receipt.",
                            ),
                        ])
                except Transaction.DoesNotExist:
                    pass

        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-payment')
    def confirm_payment(self, request, pk=None):
        """
        Client-triggered fallback to mark a transaction PAID after the Stripe payment
        sheet succeeds on-device. Needed because Stripe's server-side webhook (see
        stripe_webhook() below) cannot reach this server in local/dev environments
        without a public HTTPS tunnel — so we verify the PaymentIntent directly with
        Stripe here instead of relying solely on the webhook.
        """
        transaction = self.get_object()

        if request.user != transaction.buyer:
            return Response({'error': 'Only the buyer can confirm this payment.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db import transaction as db_transaction

        # Lock the row for the duration of this request so two concurrent
        # confirm-payment calls (or a race against the webhook) can't both pass
        # the status check below and both flip the transaction + duplicate
        # escrow notifications. The second caller blocks on select_for_update()
        # until the first commits, then re-reads the now-PAID status and falls
        # through to the "already synced" branch instead of racing.
        with db_transaction.atomic():
            locked_tx = Transaction.objects.select_for_update().get(pk=transaction.pk)

            if locked_tx.status not in [Transaction.Status.PENDING, Transaction.Status.ACCEPTED]:
                # Already synced (e.g. by the webhook, or a concurrent call) or in a
                # state that can't be confirmed here.
                return Response(self.get_serializer(locked_tx).data)

            if not locked_tx.stripe_payment_intent_id:
                return Response({'error': 'No payment intent found for this transaction.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                intent = stripe.PaymentIntent.retrieve(locked_tx.stripe_payment_intent_id)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            if intent.status != 'succeeded':
                return Response(
                    {'error': f'Payment not completed yet (status: {intent.status}).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            locked_tx.status = Transaction.Status.PAID
            locked_tx.save(update_fields=['status'])

            Notification.objects.bulk_create([
                Notification(
                    user=locked_tx.buyer,
                    title="Payment Confirmed",
                    content=f"Your payment for {locked_tx.item.name} is confirmed. Funds are held in escrow until you receive the item.",
                ),
                Notification(
                    user=locked_tx.seller,
                    title="Payment Received (Escrow)",
                    content=f"Payment for {locked_tx.item.name} has been received. Funds will be released once the buyer confirms receipt.",
                ),
            ])

            return Response(self.get_serializer(locked_tx).data)

    @action(detail=True, methods=['post'], url_path='release-funds')
    def release_funds(self, request, pk=None):
        """Releases escrowed Stripe funds to the seller once the buyer confirms receipt."""
        transaction = self.get_object()

        from django.db import transaction as db_transaction

        # Lock the row for the duration of this request. Without this, two
        # concurrent release-funds calls (double-tap on "Confirm Receipt", a
        # retried request after a slow/flaky response, etc.) can both read
        # status == PAID before either writes COMPLETED, and both would fire a
        # real stripe.Transfer.create() — paying the seller twice for one item.
        # The second caller now blocks on select_for_update() until the first
        # commits, then re-reads the now-COMPLETED status and is correctly
        # rejected below instead of racing.
        with db_transaction.atomic():
            locked_tx = Transaction.objects.select_for_update().get(pk=transaction.pk)

            # Only the buyer (or a superadmin override) can release funds.
            if request.user != locked_tx.buyer and not request.user.is_superuser:
                return Response({'error': 'Only the buyer can release funds.'}, status=status.HTTP_403_FORBIDDEN)

            if locked_tx.status != Transaction.Status.PAID:
                return Response({'error': 'Transaction is not in Escrow (PAID) state.'}, status=status.HTTP_400_BAD_REQUEST)

            seller_profile = locked_tx.seller.profile
            if not seller_profile.stripe_account_id:
                return Response({'error': 'Seller has not set up Stripe payouts.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                amount_cents = int(locked_tx.effective_price * 100)

                # Retrieve the Payment Intent charge ID to link the transfer to the original payment.
                # This allows the transfer to succeed even while funds are still "pending".
                charge_id = None
                if locked_tx.stripe_payment_intent_id:
                    intent = stripe.PaymentIntent.retrieve(locked_tx.stripe_payment_intent_id)
                    charge_id = intent.latest_charge

                transfer_kwargs = {
                    'amount': amount_cents,
                    'currency': 'myr',
                    'destination': seller_profile.stripe_account_id,
                    'metadata': {'transaction_id': locked_tx.id},
                }
                if charge_id:
                    transfer_kwargs['source_transaction'] = charge_id

                stripe.Transfer.create(**transfer_kwargs)

                locked_tx.status = Transaction.Status.COMPLETED
                locked_tx.save(update_fields=['status'])

                return Response({'status': 'Funds released successfully.'})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        """Returns full receipt data for a completed or paid transaction."""
        transaction = self.get_object()

        if request.user != transaction.buyer and request.user != transaction.seller and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        data = {
            'id': transaction.id,
            'item_name': transaction.item.name if transaction.item else 'N/A',
            'buyer_name': transaction.buyer.username,
            'seller_name': transaction.seller.username,
            'amount': float(transaction.effective_price),
            'payment_method': transaction.payment_method,
            'status': transaction.status,
            'stripe_payment_intent_id': transaction.stripe_payment_intent_id,
            'created_at': transaction.created_at.isoformat(),
        }
        return Response(data)

    @action(detail=True, methods=['post'], url_path='admin-override')
    def admin_override(self, request, pk=None):
        """Superadmin-only: force a transaction into any status with a reason notification."""
        if not request.user.is_superuser:
            raise PermissionDenied("Only admins can use this override.")

        transaction = self.get_object()
        new_status = request.data.get('status')
        reason = request.data.get('reason', 'Admin intervention.')

        if not new_status or new_status not in dict(Transaction.Status.choices):
            return Response({'error': 'Invalid or missing status.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = transaction.status
        transaction.status = new_status
        transaction.save(update_fields=['status'])

        # Notify both parties about the admin action.
        Notification.objects.bulk_create([
            Notification(
                user=transaction.buyer,
                title="Transaction Updated by Admin",
                content=f"Your transaction for '{transaction.item.name}' has been updated from {old_status} to {new_status}. Reason: {reason}",
                related_id=transaction.id,
            ),
            Notification(
                user=transaction.seller,
                title="Transaction Updated by Admin",
                content=f"Your transaction for '{transaction.item.name}' has been updated from {old_status} to {new_status}. Reason: {reason}",
                related_id=transaction.id,
            ),
        ])

        return Response({
            'status': f'Transaction {transaction.id} updated to {new_status}.',
            'transaction': self.get_serializer(transaction).data,
        })


# ---------------------------------------------------------------------------
# ScamReportViewSet
# ---------------------------------------------------------------------------

class ScamReportViewSet(viewsets.ModelViewSet):
    """Viewset to log and adjudicate reports of scams and user abuse."""

    serializer_class = ScamReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Reports are immutable once submitted.
    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot modify a submitted scam report.")

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot modify a submitted scam report.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot delete scam reports.")

    def get_queryset(self):
        """Expose all reports to admins; restrict standard users to reports they submitted."""
        user = self.request.user
        qs = ScamReport.objects.select_related('reporter', 'reported_user', 'item')
        if user.is_superuser:
            return qs
        return qs.filter(reporter=user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Mark a scam report as resolved and inform the reporter."""
        if not request.user.is_superuser:
            raise PermissionDenied("Only admins can approve scam reports.")

        report = self.get_object()
        ScamReport.objects.filter(pk=report.pk).update(status=ScamReport.Status.RESOLVED)

        Notification.objects.create(
            user=report.reporter,
            title="Report Resolved",
            content=f"Your report regarding {report.reported_user.username} has been resolved by our admins.",
        )
        return Response({'status': 'report approved'})

    @action(detail=True, methods=['post'], url_path='dismiss')
    def dismiss(self, request, pk=None):
        """Dismiss a scam report, marking it accordingly."""
        if not request.user.is_superuser:
            raise PermissionDenied("Only admins can dismiss scam reports.")

        report = self.get_object()
        ScamReport.objects.filter(pk=report.pk).update(status=ScamReport.Status.DISMISSED)

        Notification.objects.create(
            user=report.reporter,
            title="Report Dismissed",
            content=f"Your report regarding {report.reported_user.username} has been reviewed and dismissed by our admins.",
        )
        return Response({'status': 'report dismissed'})


# ---------------------------------------------------------------------------
# ReviewViewSet
# ---------------------------------------------------------------------------

class ReviewViewSet(viewsets.ModelViewSet):
    """Viewset to view and draft reviews and ratings for item transactions."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter reviews dynamically based on optional seller or reviewer query params."""
        queryset = Review.objects.select_related('item', 'reviewer', 'seller').all()

        seller_id = self.request.query_params.get('seller')
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)

        reviewer_id = self.request.query_params.get('reviewer')
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.reviewer != self.request.user and not self.request.user.is_superuser:
            raise PermissionDenied("You do not have permission to update this review.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.reviewer != self.request.user and not self.request.user.is_superuser:
            raise PermissionDenied("You do not have permission to delete this review.")
        instance.delete()
