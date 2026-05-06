from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, Review

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

class ItemSerializer(serializers.ModelSerializer):
    """Marketplace item listing with nested seller and category info."""
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Item
        fields = (
            'id', 'seller', 'seller_name', 'category', 'category_name',
            'name', 'description', 'price', 'calculated_grade',
            'is_sold', 'created_at'
        )
        read_only_fields = ('seller', 'calculated_grade') # Grade should eventually be calculated, not set directly.

class ReviewSerializer(serializers.ModelSerializer):
    """Transaction reviews."""
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('reviewer',)
