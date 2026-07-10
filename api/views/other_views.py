"""
Handles views for auxiliary user features such as favorites, seller bundles,
item price drop alerts, and user-to-user blocking records.
"""
# --- third-party ---
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

# --- local ---
from django.db.models import Prefetch
from ..models import Block, Bundle, Favorite, PriceAlert, Transaction
from ..serializers import BlockSerializer, BundleSerializer, FavoriteSerializer, PriceAlertSerializer


# ---------------------------------------------------------------------------
# FavoriteViewSet
# ---------------------------------------------------------------------------

class FavoriteViewSet(viewsets.ModelViewSet):
    """Retrieve and manage items marked as favorite by the authenticated user."""

    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Fetch the current user's favorites including item relations.
        return Favorite.objects.filter(user=self.request.user).select_related('item__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# BundleViewSet
# ---------------------------------------------------------------------------

class BundleViewSet(viewsets.ModelViewSet):
    """Create and retrieve group-item seller bundles."""

    # The class-level queryset is used for schema generation and router reversals.
    queryset = Bundle.objects.select_related('seller__profile').prefetch_related(
        'items__images', 
        'items__category',
        'items__seller__profile',
        Prefetch(
            'items__seller__sales',
            queryset=Transaction.objects.filter(status=Transaction.Status.COMPLETED).only('id', 'seller_id'),
            to_attr='completed_sales',
        )
    )
    serializer_class = BundleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        seller_id = self.request.query_params.get('seller_id')
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.seller != self.request.user and not self.request.user.is_superuser:
            raise PermissionDenied("You do not have permission to update this bundle.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.seller != self.request.user and not self.request.user.is_superuser:
            raise PermissionDenied("You do not have permission to delete this bundle.")
        instance.delete()


# ---------------------------------------------------------------------------
# PriceAlertViewSet
# ---------------------------------------------------------------------------

class PriceAlertViewSet(viewsets.ModelViewSet):
    """Establish and retrieve price drop notifications for specific items."""

    serializer_class = PriceAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user).select_related('item')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# BlockViewSet
# ---------------------------------------------------------------------------

class BlockViewSet(viewsets.ModelViewSet):
    """Handle blocking other users to restrict communication and item visibility."""

    serializer_class = BlockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Block.objects.filter(blocker=self.request.user).select_related('blocked')

    def perform_create(self, serializer):
        serializer.save(blocker=self.request.user)
