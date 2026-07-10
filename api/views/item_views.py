"""
Handles item and category listing views, including location/price filtering,
item recommendations via Jaccard similarity, and heuristic price suggestions.
"""
# --- django ---
from django.db.models import Prefetch
from django.db.models import F

# --- third-party ---
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

# --- local ---
from ..models import Block, Category, Favorite, Item, Transaction
from ..serializers import CategorySerializer, ItemSerializer
from ..throttles import UserBurstThrottle, UserSustainedThrottle
from ..validators import validate_price_param, validate_suggest_price_payload


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def jaccard_similarity(set1, set2):
    """
    Calculates Jaccard Similarity between two sets.
    J(A,B) = |A ∩ B| / |A ∪ B|
    Used to find similar items without ML models (FYP Diploma requirement).
    """
    union = set1 | set2
    if not union:
        return 0.0
    return len(set1 & set2) / len(union)


# ---------------------------------------------------------------------------
# CategoryViewSet
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    """Retrieve and manage item categories."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


# ---------------------------------------------------------------------------
# ItemViewSet
# ---------------------------------------------------------------------------

# Pre-build the base queryset with all required joins/prefetches so every
# action benefits from it without repeating select_related calls in each method.
_ITEM_BASE_QUERYSET = Item.objects.select_related(
    'seller__profile',
    'category',
).prefetch_related(
    'images',
    # Prefetch only COMPLETED sales so get_seller_sales_count doesn't query per item.
    Prefetch(
        'seller__sales',
        queryset=Transaction.objects.filter(status=Transaction.Status.COMPLETED).only('id', 'seller_id'),
        to_attr='completed_sales',
    ),
)


class ItemViewSet(viewsets.ModelViewSet):
    """
    Retrieve items with pre-fetched related seller profiles and images to prevent N+1 queries.
    """

    queryset = _ITEM_BASE_QUERYSET
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    filterset_fields = ['category', 'calculated_grade', 'is_sold', 'price']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def get_permissions(self):
        # Restrict write operations to authenticated users.
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'toggle_favorite'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """
        Applies custom filters for item availability, location, price ranges,
        and blocked users.  Superusers bypass user-facing filters.
        """
        queryset = super().get_queryset()

        if self.request.user.is_superuser:
            return queryset

        # Default: show only unsold items on list actions (unless caller overrides).
        is_sold_filter = self.request.query_params.get('is_sold')
        if is_sold_filter is None and self.action == 'list':
            queryset = queryset.filter(is_sold=False)

        # Location filter.
        location = self.request.query_params.get('location')
        if location and location != 'All':
            queryset = queryset.filter(seller__profile__location__icontains=location)

        # Price range filters — silently ignore invalid values.
        price_min_raw = self.request.query_params.get('price_min')
        if price_min_raw:
            try:
                price_min = validate_price_param(price_min_raw, 'price_min')
                queryset = queryset.filter(price__gte=price_min)
            except serializers.ValidationError:
                pass

        price_max_raw = self.request.query_params.get('price_max')
        if price_max_raw:
            try:
                price_max = validate_price_param(price_max_raw, 'price_max')
                queryset = queryset.filter(price__lte=price_max)
            except serializers.ValidationError:
                pass

        # Exclude items from sellers the current user has blocked.
        if self.request.user.is_authenticated:
            blocked_user_ids = Block.objects.filter(
                blocker=self.request.user
            ).values_list('blocked_id', flat=True)
            queryset = queryset.exclude(seller_id__in=blocked_user_ids)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Increment the view count when an item is retrieved directly."""
        instance = self.get_object()
        # Use F() expression to avoid a read-modify-write race condition.
        Item.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
        # Refresh in-memory value so the serializer response is accurate.
        instance.view_count += 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.seller != self.request.user and not self.request.user.is_superuser:
            raise permissions.exceptions.PermissionDenied("You do not have permission to update this item.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.seller != self.request.user and not self.request.user.is_superuser:
            raise permissions.exceptions.PermissionDenied("You do not have permission to delete this item.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        """Toggles the favorite status of an item for the authenticated user."""
        item = self.get_object()
        favorite, created = Favorite.objects.get_or_create(user=request.user, item=item)
        if not created:
            favorite.delete()
            return Response({'status': 'removed from favorites'})
        return Response({'status': 'added to favorites'})

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """
        DIPLOMA FYP: Jaccard Similarity Algorithm implementation.
        Finds the top 5 most similar available items based on set intersection of attributes.

        NOTE: This is an O(n) in-memory scan — acceptable for a diploma FYP with a small
        dataset. For production scale, use a vector search index (e.g. pgvector, Elasticsearch).
        """
        target_item = self.get_object()

        target_set = {
            target_item.category.name if target_item.category else "",
            target_item.brand,
            target_item.calculated_grade,
        } | set(target_item.name.lower().split())

        # Fetch only the columns needed for similarity scoring, with category join.
        candidates = (
            Item.objects
            .filter(is_sold=False)
            .exclude(id=target_item.id)
            .select_related('category', 'seller__profile')
            .prefetch_related('images')
            .only(
                'id', 'name', 'brand', 'calculated_grade',
                'seller_id', 'category_id', 'is_sold',
            )
        )

        similarities = []
        for item in candidates:
            item_set = {
                item.category.name if item.category else "",
                item.brand,
                item.calculated_grade,
            } | set(item.name.lower().split())

            score = jaccard_similarity(target_set, item_set)
            if score > 0:
                similarities.append((score, item))

        similarities.sort(key=lambda x: x[0], reverse=True)
        top_similar = [item for _, item in similarities[:5]]

        serializer = self.get_serializer(top_similar, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# SuggestPriceView
# ---------------------------------------------------------------------------

class SuggestPriceView(APIView):
    """
    Heuristic price suggestion endpoint.
    Requires authentication to prevent unauthenticated bulk probing.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserBurstThrottle, UserSustainedThrottle]

    # Brand value-retention coefficients.
    _BRAND_MULTIPLIERS = {
        'Apple': 0.90, 'Samsung': 0.80, 'Sony': 0.85, 'Dell': 0.75, 'Asus': 0.78,
        'Nike': 0.70, 'Adidas': 0.68, 'Gucci': 0.88, 'Chanel': 0.92,
        'Pearson': 0.55, 'Oxford': 0.50, 'Penguin': 0.40,
    }

    def post(self, request, *args, **kwargs):
        # Validate payload strictly — reject unknown fields and enforce type/range constraints.
        try:
            params = validate_suggest_price_payload(request.data)
        except serializers.ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        category = params['category']
        brand = params['brand']
        condition_score = params['condition_score']
        duration_days = params['duration_days']
        original_price = params['original_price']

        # Base price-retention percentage by category.
        base_retention = 0.80 if category == 'Tech' else (0.65 if category == 'Fashion' else 0.45)

        # Brand-specific retention multiplier (defaults to 0.70 for unknown brands).
        brand_retention = self._BRAND_MULTIPLIERS.get(brand, 0.70)

        # Condition multiplier: condition_score of 10 → full base retention; 0 → 25%.
        condition_multiplier = 0.25 + 0.75 * (condition_score / 10.0)

        suggested_price = original_price * base_retention * brand_retention * condition_multiplier

        # Apply a discount penalty for longer target selling durations.
        if duration_days > 7:
            negotiation_discount = min(0.20, (duration_days - 7) * 0.0025)
            suggested_price *= (1.0 - negotiation_discount)

        # Ensure price is non-negative and rounded to cents.
        suggested_price = max(0.0, round(suggested_price, 2))

        return Response({'suggested_price': suggested_price}, status=status.HTTP_200_OK)
