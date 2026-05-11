# serializers.py
# Data Translators for MyPreLove.
# This file converts database objects into JSON for the mobile app.

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, ItemImage, Transaction, Message, ScamReport, Notification, Review

class UserSerializer(serializers.ModelSerializer):
    # Display basic user info. 
    # Username and email are read only.
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('username', 'email')


class ChangePasswordSerializer(serializers.Serializer):
    # Validate password update requests.
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


class RegisterSerializer(serializers.ModelSerializer):
    # Handle user registration logic. 
    # Confirm passwords match before saving.
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
        Profile.objects.get_or_create(user=user)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    # Structure user profile data.
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'username', 'trust_score', 'is_verified', 'profile_picture')
        read_only_fields = ('trust_score', 'is_verified')


class CategorySerializer(serializers.ModelSerializer):
    # Format item categories.
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')


class ItemImageSerializer(serializers.ModelSerializer):
    # Format individual item images.
    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'created_at')


class ItemSerializer(serializers.ModelSerializer):
    # Detailed item data structure. 
    # Manage image uploads and grade display.
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
    # Format sale transaction data.
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
    # Format in app chat messages.
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'item', 'content', 'timestamp', 'is_read')
        read_only_fields = ('sender',)


class ScamReportSerializer(serializers.ModelSerializer):
    # Structure fraud report data.
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
    # Format seller feedback.
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('reviewer',)


class NotificationSerializer(serializers.ModelSerializer):
    # Structure user alert data.
    class Meta:
        model = Notification
        fields = ('id', 'title', 'content', 'is_read', 'created_at')
