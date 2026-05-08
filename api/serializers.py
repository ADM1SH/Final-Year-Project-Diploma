from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, ItemImage, Transaction, Message, ScamReport, Notification, Review

"""
EXPLANATION: Serializers are like 'Translators'. 
They convert complex Python Database Objects into simple JSON data 
that your Android app can read and understand.
"""

class UserSerializer(serializers.ModelSerializer):
    """Provides basic info about a user (ID, Username, Email)."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('username', 'email')


class ChangePasswordSerializer(serializers.Serializer):
    """Used for the 'Update Password' feature. Not linked to a model directly."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class RegisterSerializer(serializers.ModelSerializer):
    """Handles new user sign-ups. Includes a password confirmation check."""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        # Security check: passwords must match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        # Create the user and their profile simultaneously
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        Profile.objects.get_or_create(user=user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    """Returns the Trust Score and Verification status for a user profile."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'username', 'trust_score', 'is_verified', 'profile_picture')
        read_only_fields = ('trust_score', 'is_verified')

class NotificationSerializer(serializers.ModelSerializer):
    """Returns user notifications (like 'New Message' or 'Item Sold')."""
    class Meta:
        model = Notification
        fields = ('id', 'title', 'content', 'is_read', 'created_at')

class CategorySerializer(serializers.ModelSerializer):
    """Returns available item categories."""
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')

class ItemImageSerializer(serializers.ModelSerializer):
    """Returns individual images from an item's gallery."""
    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'created_at')

class ItemSerializer(serializers.ModelSerializer):
    """
    The big one! Returns item details including the calculated grade 
    and the full gallery of images.
    """
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ItemImageSerializer(many=True, read_only=True)
    
    # This field allows the mobile app to send multiple files at once during upload
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Item
        fields = (
            'id', 'seller', 'seller_name', 'category', 'category_name',
            'name', 'description', 'price', 
            'is_fully_functional', 'has_scratches', 'has_dents_cracks', 
            'has_original_box', 'has_receipt',
            'calculated_grade', 'is_sold', 'images', 'uploaded_images', 'created_at'
        )
        read_only_fields = ('seller', 'calculated_grade', 'images')

    def create(self, validated_data):
        # Custom logic to handle the multiple images after creating the item
        uploaded_images = validated_data.pop('uploaded_images', [])
        item = Item.objects.create(**validated_data)
        for image in uploaded_images:
            ItemImage.objects.create(item=item, image=image)
        return item

class TransactionSerializer(serializers.ModelSerializer):
    """Handles the details of a buyer-seller handshake."""
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = Transaction
        fields = (
            'id', 'item', 'item_name', 'buyer', 'buyer_name', 
            'seller', 'seller_name', 'final_price', 'status', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('buyer', 'seller')

class MessageSerializer(serializers.ModelSerializer):
    """Converts chat messages into JSON for the mobile inbox."""
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'item', 'content', 'timestamp', 'is_read')
        read_only_fields = ('sender',)

class ScamReportSerializer(serializers.ModelSerializer):
    """Used for reporting fraudulent users."""
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    reported_user_name = serializers.CharField(source='reported_user.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = ScamReport
        fields = (
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'item', 'item_name', 'reason', 'status', 'created_at', 'updated_at'
        )
        read_only_fields = ('reporter', 'status')

class ReviewSerializer(serializers.ModelSerializer):
    """Handles ratings and textual feedback for sellers."""
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('reviewer',)
