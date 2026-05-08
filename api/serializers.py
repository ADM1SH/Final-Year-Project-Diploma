from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, ItemImage, Transaction, Message, Review

class UserSerializer(serializers.ModelSerializer):
    """Minimal user details for public nesting."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('username', 'email')

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        # Profile is created automatically if using signals, but we'll do it explicitly for clarity
        Profile.objects.get_or_create(user=user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    """User profile data including trust score and verification."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'username', 'trust_score', 'is_verified', 'profile_picture')
        read_only_fields = ('trust_score', 'is_verified')

class CategorySerializer(serializers.ModelSerializer):
    """Listing categories."""
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')

class ItemImageSerializer(serializers.ModelSerializer):
    """Serializer for item gallery images."""
    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'created_at')

class ItemSerializer(serializers.ModelSerializer):
    """Marketplace item listing with nested seller, category, and gallery info."""
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ItemImageSerializer(many=True, read_only=True)
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
        uploaded_images = validated_data.pop('uploaded_images', [])
        item = Item.objects.create(**validated_data)
        for image in uploaded_images:
            ItemImage.objects.create(item=item, image=image)
        return item

class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for marketplace transactions."""
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
    """Serializer for in-app messages."""
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'item', 'content', 'timestamp', 'is_read')
        read_only_fields = ('sender',)

class ReviewSerializer(serializers.ModelSerializer):
    """Transaction reviews."""
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('reviewer',)
