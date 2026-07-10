"""
Defines the REST framework serializers for database models,
providing input validation, representation parsing, and user registration logic.
"""
# --- django ---
from django.contrib.auth.models import User

# --- third-party ---
from rest_framework import serializers

# --- local ---
from .models import (
    Block, Bundle, Category, Favorite, Item, ItemImage,
    Message, Notification, PriceAlert, Profile, Review,
    ScamReport, Transaction,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FALLBACK_IMAGES = {
    'Men': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
    'Women': 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=800&auto=format&fit=crop',
    'Tech': 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
    'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop',
}
_FALLBACK_DEFAULT = 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop'


def get_fallback_category_image(category_name):
    """Returns a curated Unsplash fallback URL for a given category name."""
    return _FALLBACK_IMAGES.get(category_name, _FALLBACK_DEFAULT)


def build_image_url(request, image_field):
    """
    Returns an absolute URL for an image field using the request context.
    Falls back to the raw relative URL if no request is available.
    """
    if not image_field:
        return None
    if request:
        return request.build_absolute_uri(image_field.url)
    return image_field.url


# ---------------------------------------------------------------------------
# Auth Serializers
# ---------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_active')
        read_only_fields = ('username', 'email', 'is_active')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Ensure email addresses are unique across the system.
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        # Profile is also created by the post_save signal; get_or_create is safe here
        # because the signal fires inside the same transaction.
        Profile.objects.get_or_create(user=user)
        return user


# ---------------------------------------------------------------------------
# Profile Serializer
# ---------------------------------------------------------------------------

class ProfileSerializer(serializers.ModelSerializer):

    username = serializers.CharField(source='user.username', read_only=True)
    # response_time is a Python @property; it hits the DB once via a filtered queryset.
    response_time = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            'id', 'user', 'username', 'trust_score', 'is_verified',
            'profile_picture', 'verification_document',
            'bio', 'location', 'phone_number', 'response_time',
        )
        read_only_fields = ('user', 'trust_score', 'is_verified', 'response_time')


# ---------------------------------------------------------------------------
# Category Serializer
# ---------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')


# ---------------------------------------------------------------------------
# Item Serializers
# ---------------------------------------------------------------------------

class ItemImageSerializer(serializers.ModelSerializer):

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'image_url', 'created_at')

    def get_image_url(self, obj):
        request = self.context.get('request')
        return build_image_url(request, obj.image)


class ItemSerializer(serializers.ModelSerializer):

    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_trust_score = serializers.FloatField(source='seller.profile.trust_score', read_only=True)
    seller_location = serializers.CharField(source='seller.profile.location', read_only=True)
    # response_time is a property that triggers one DB call — it is accessed once per
    # serialization and the result is cached on the profile instance by Python.
    seller_response_time = serializers.CharField(source='seller.profile.response_time', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ItemImageSerializer(many=True, read_only=True)
    display_image = serializers.SerializerMethodField()

    # seller_sales_count uses a prefetch_related annotation ('completed_sales') when
    # the queryset is prepared in the viewset, avoiding a per-item DB hit.
    seller_sales_count = serializers.SerializerMethodField()
    seller_profile_picture = serializers.SerializerMethodField()

    # write-only field for multipart image uploads
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Item
        fields = (
            'id', 'seller', 'seller_name', 'seller_trust_score', 'seller_sales_count',
            'seller_location', 'seller_profile_picture', 'seller_response_time',
            'category', 'category_name',
            'name', 'description', 'price', 'weight', 'eco_impact', 'is_negotiable',
            'brand', 'original_price',
            'is_fully_functional', 'has_scratches', 'has_dents_cracks',
            'has_original_box', 'has_receipt',
            'is_clean', 'has_all_accessories', 'has_repair_history',
            'battery_health_good', 'is_modified',
            'calculated_grade', 'is_sold', 'view_count', 'flaw_disclosure',
            'images', 'display_image', 'uploaded_images', 'created_at',
        )
        read_only_fields = ('seller', 'calculated_grade', 'images', 'view_count')

    # ------------------------------------------------------------------
    # NOTE: has_scratches / has_dents_cracks / has_repair_history / is_modified
    # are stored inverted in the DB relative to what the mobile client sends.
    # The client sends True = "item HAS this positive quality" (e.g. "no scratches"),
    # but the DB stores the literal flag (True = problem exists).
    # validate() inverts on input; to_representation() inverts on output.
    # ------------------------------------------------------------------

    def validate(self, attrs):
        # Invert condition flags to align with DB storage semantics.
        for field in ('has_scratches', 'has_dents_cracks', 'has_repair_history', 'is_modified'):
            if field in attrs:
                attrs[field] = not attrs[field]
        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Invert condition flags back for frontend representation compatibility.
        for field in ('has_scratches', 'has_dents_cracks', 'has_repair_history', 'is_modified'):
            if field in ret:
                ret[field] = not getattr(instance, field)
        return ret

    def get_seller_sales_count(self, obj):
        # Uses the prefetched 'completed_sales' attr when available to avoid extra DB hit.
        if hasattr(obj.seller, 'completed_sales'):
            return len(obj.seller.completed_sales)
        return obj.seller.sales.filter(status='COMPLETED').count()

    def get_seller_profile_picture(self, obj):
        request = self.context.get('request')
        try:
            pic = obj.seller.profile.profile_picture
        except Profile.DoesNotExist:
            return None
        return build_image_url(request, pic)

    def get_display_image(self, obj):
        # 'images' is prefetched on the queryset — accessing obj.images.all() here
        # reuses the prefetch cache and does NOT issue another query.
        first_image = next(iter(obj.images.all()), None)
        if first_image and first_image.image:
            request = self.context.get('request')
            return build_image_url(request, first_image.image)

        category_name = obj.category.name if obj.category else 'Tech'
        return get_fallback_category_image(category_name)

    def create(self, validated_data):
        validated_data.pop('uploaded_images', [])

        # Extract uploaded files from the multipart request context.
        request = self.context.get('request')
        files = request.FILES.getlist('uploaded_images') if request and request.FILES else []

        item = Item.objects.create(**validated_data)

        # Bulk-create all associated image records in one round-trip.
        ItemImage.objects.bulk_create([
            ItemImage(item=item, image=image) for image in files
        ])
        return item


# ---------------------------------------------------------------------------
# Transaction Serializer
# ---------------------------------------------------------------------------

class TransactionSerializer(serializers.ModelSerializer):

    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_category = serializers.CharField(source='item.category.name', read_only=True)
    item_id = serializers.IntegerField(source='item.id', read_only=True)
    item_display_image = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id', 'item', 'item_id', 'item_name', 'item_category', 'item_display_image',
            'buyer', 'buyer_name', 'seller', 'seller_name',
            'final_price', 'offer_price', 'payment_method',
            'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('buyer', 'seller', 'final_price')

    def get_item_display_image(self, obj):
        # 'item__images' is prefetched on the viewset queryset.
        first_image = next(iter(obj.item.images.all()), None)
        if first_image and first_image.image:
            request = self.context.get('request')
            return build_image_url(request, first_image.image)

        category_name = obj.item.category.name if obj.item.category else 'Tech'
        return get_fallback_category_image(category_name)


# ---------------------------------------------------------------------------
# Message Serializer
# ---------------------------------------------------------------------------

class MessageSerializer(serializers.ModelSerializer):

    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)
    item_display_image = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            'id', 'sender', 'sender_name', 'receiver', 'receiver_name',
            'item', 'item_name', 'item_price', 'item_display_image',
            'content', 'timestamp', 'is_read', 'is_offer', 'offer_price', 'offer_status',
        )
        read_only_fields = ('sender',)

    def get_item_display_image(self, obj):
        if not obj.item:
            return None
        # 'item__images' is prefetched in the viewset queryset.
        first_image = next(iter(obj.item.images.all()), None)
        if first_image and first_image.image:
            request = self.context.get('request')
            return build_image_url(request, first_image.image)

        category_name = obj.item.category.name if obj.item.category else 'Tech'
        return get_fallback_category_image(category_name)


# ---------------------------------------------------------------------------
# Other Serializers
# ---------------------------------------------------------------------------

class ScamReportSerializer(serializers.ModelSerializer):

    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    reported_user_name = serializers.CharField(source='reported_user.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = ScamReport
        fields = (
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'item', 'item_name', 'reason', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('reporter', 'status')


class ReviewSerializer(serializers.ModelSerializer):

    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name',
            'rating', 'comment', 'created_at',
        )
        read_only_fields = ('reviewer',)


class NotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notification
        fields = ('id', 'title', 'content', 'is_read', 'related_id', 'created_at')


class FavoriteSerializer(serializers.ModelSerializer):

    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)

    class Meta:
        model = Favorite
        fields = ('id', 'user', 'item', 'item_name', 'item_price', 'created_at')
        read_only_fields = ('user',)


class BundleSerializer(serializers.ModelSerializer):

    seller_name = serializers.CharField(source='seller.username', read_only=True)
    # Nested ItemSerializer triggers select_related/prefetch done in the viewset queryset.
    item_details = ItemSerializer(source='items', many=True, read_only=True)

    class Meta:
        model = Bundle
        fields = ('id', 'seller', 'seller_name', 'name', 'items', 'item_details', 'price', 'created_at')
        read_only_fields = ('seller',)


class PriceAlertSerializer(serializers.ModelSerializer):

    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.DecimalField(source='item.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PriceAlert
        fields = ('id', 'user', 'item', 'item_name', 'item_price', 'target_price', 'created_at')
        read_only_fields = ('user',)


class BlockSerializer(serializers.ModelSerializer):

    blocked_username = serializers.CharField(source='blocked.username', read_only=True)

    class Meta:
        model = Block
        fields = ('id', 'blocker', 'blocked', 'blocked_username', 'created_at')
        read_only_fields = ('blocker',)
