# serializers.py
# Data Translators for MyPreLove.
# This file converts database objects into JSON for the mobile app.

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, ItemImage, Transaction, Message, ScamReport, Notification, Review, Favorite, WalletTransaction

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
        
        # Check if email is already in use
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
            
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
        fields = ('id', 'user', 'username', 'trust_score', 'is_verified', 'profile_picture', 'wallet_balance')
        read_only_fields = ('user', 'trust_score', 'is_verified', 'wallet_balance')


class CategorySerializer(serializers.ModelSerializer):
    # Format item categories.
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')


class ItemImageSerializer(serializers.ModelSerializer):
    # Format individual item images.
    image_url = serializers.SerializerMethodField()
    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'image_url', 'created_at')
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            # Fallback to relative path if request is missing (should be handled by client)
            return obj.image.url
        return None

class ItemSerializer(serializers.ModelSerializer):
    # Detailed item data structure. 
    # Manage image uploads and grade display.
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_trust_score = serializers.FloatField(source='seller.profile.trust_score', read_only=True)
    seller_sales_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ItemImageSerializer(many=True, read_only=True)
    display_image = serializers.SerializerMethodField()

    # We'll handle this manually in create to support multiple files in multipart
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Item
        fields = (
            'id', 'seller', 'seller_name', 'seller_trust_score', 'seller_sales_count',
            'category', 'category_name',
            'name', 'description', 'price', 'weight', 'eco_impact', 'is_negotiable',
            'is_fully_functional', 'has_scratches', 'has_dents_cracks', 
            'has_original_box', 'has_receipt',
            'calculated_grade', 'is_sold', 'images', 'display_image', 'uploaded_images', 'created_at'
        )
        read_only_fields = ('seller', 'calculated_grade', 'images')

    def get_seller_sales_count(self, obj):
        if hasattr(obj.seller, 'completed_sales'):
            return len(obj.seller.completed_sales)
        return obj.seller.sales.filter(status='COMPLETED').count()

    def get_display_image(self, obj):
        # Return first image if available from prefetched list
        images = list(obj.images.all())
        first_image = images[0] if images else None
        if (first_image and first_image.image):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        
        # Fallback to high-quality Unsplash images based on category
        fallbacks = {
            'Men': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
            'Women': 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=800&auto=format&fit=crop',
            'Tech': 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
            'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop'
        }
        return fallbacks.get(obj.category.name if obj.category else 'Tech', 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop')

    def create(self, validated_data):
        # Pop uploaded_images if present in validated_data
        # Note: In multipart, ListField might not always populate correctly depending on the parser
        validated_data.pop('uploaded_images', [])
        
        # Get files directly from the request context if possible
        request = self.context.get('request')
        files = []
        if request and request.FILES:
            files = request.FILES.getlist('uploaded_images')

        item = Item.objects.create(**validated_data)
        for image in files:
            ItemImage.objects.create(item=item, image=image)
        return item


class TransactionSerializer(serializers.ModelSerializer):
    # Format sale transaction data.
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_id = serializers.IntegerField(source='item.id', read_only=True)
    item_display_image = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id', 'item', 'item_id', 'item_name', 'item_display_image', 'buyer', 'buyer_name', 
            'seller', 'seller_name', 'final_price', 'offer_price', 'payment_method', 'status', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('buyer', 'seller', 'final_price')

    def validate(self, attrs):
        status = attrs.get('status')
        # Determine the payment method chosen (defaulting to the existing value if this is an update)
        payment_method = attrs.get('payment_method', self.instance.payment_method if self.instance else 'WALLET')
        
        # We only enforce wallet balance checks if the payment method chosen is WALLET
        if payment_method == 'WALLET':
            # On update to COMPLETED
            if self.instance and status == 'COMPLETED' and self.instance.status != 'COMPLETED':
                buyer_profile = self.instance.buyer.profile
                price = self.instance.offer_price if self.instance.offer_price is not None else self.instance.final_price
                if buyer_profile.wallet_balance < price:
                    raise serializers.ValidationError({"status": "Insufficient wallet balance to complete this transaction."})
            # On creation as COMPLETED
            elif not self.instance and status == 'COMPLETED':
                request = self.context.get('request')
                user = request.user if request and request.user.is_authenticated else None
                if not user:
                    from django.contrib.auth.models import User
                    user = User.objects.first()
                if user:
                    buyer_profile = user.profile
                    item = attrs.get('item')
                    offer_price = attrs.get('offer_price')
                    price = offer_price if offer_price is not None else item.price
                    if buyer_profile.wallet_balance < price:
                        raise serializers.ValidationError("Insufficient wallet balance.")
        return attrs

    def get_item_display_image(self, obj):
        # Return first image if available from prefetched list
        images = list(obj.item.images.all())
        first_image = images[0] if images else None
        if (first_image and first_image.image):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        
        # Fallback to high-quality Unsplash images based on category
        fallbacks = {
            'Men': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
            'Women': 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=800&auto=format&fit=crop',
            'Tech': 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
            'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop'
        }
        return fallbacks.get(obj.item.category.name if obj.item.category else 'Tech', 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop')


class MessageSerializer(serializers.ModelSerializer):
    # Format in app chat messages.
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)
    item_display_image = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'item', 'item_name', 'item_price', 'item_display_image', 'content', 'timestamp', 'is_read')
        read_only_fields = ('sender',)

    def get_item_display_image(self, obj):
        if obj.item:
            images = list(obj.item.images.all())
            first_image = images[0] if images else None
            if first_image and first_image.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_image.image.url)
                return first_image.image.url
            # Fallback
            fallbacks = {
                'Men': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
                'Women': 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=800&auto=format&fit=crop',
                'Tech': 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
                'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop'
            }
            return fallbacks.get(obj.item.category.name if obj.item.category else 'Tech', 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop')
        return None


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
        fields = ('id', 'title', 'content', 'is_read', 'related_id', 'created_at')


class FavoriteSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ('id', 'user', 'item', 'item_name', 'item_price', 'created_at')
        read_only_fields = ('user',)


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ('id', 'amount', 'tx_type', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')
