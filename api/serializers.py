# =====================================================================
# SYSTEM/PROJECT NAME: MyPreLove (Secondhand Eco-Marketplace Mobile App)
# COURSE: Diploma in Information Technology (DIT)
# MODULE: Final Year Project (FYP) - DIT3004 / DIT3102
# MEMBERS: Adam Anwar & FYP Group
# FILE NAME: serializers.py
# PURPOSE: Serializers for Django REST Framework. Converts database
#          models to/from JSON payloads so the React Native app can
#          make API requests and receive structured data.
# =====================================================================

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Profile, Item, ItemImage, Transaction, Message, ScamReport, Notification, Review, Favorite, WalletTransaction, Bundle, PriceAlert, Block

# DIPLOMA FYP COMMENT:
# A single shared helper function to return high-quality Unsplash fallbacks
# based on the category name when no custom images are uploaded.
# DRY (Don't Repeat Yourself) principle helps keep serializers clean!
def get_fallback_category_image(category_name):
    # Map each category to a curated Unsplash photo that looks good on the listing card
    fallbacks = {
        'Men': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800&auto=format&fit=crop',
        'Women': 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=800&auto=format&fit=crop',
        'Tech': 'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=800&auto=format&fit=crop',
        'Books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop'
    }
    # Return the matching photo, or a generic marketplace shot if the category isn't in our list
    return fallbacks.get(category_name, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop')

# Lightweight serializer used wherever we just need to show who a user is — e.g. in chat headers
class UserSerializer(serializers.ModelSerializer):
    # Display basic user info. 
    # Username and email are read only.
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        # Prevent accidental username/email changes via this endpoint
        read_only_fields = ('username', 'email')


# Used by the change-password endpoint — just two fields, old and new, both required
class ChangePasswordSerializer(serializers.Serializer):
    # Validate password update requests.
    old_password = serializers.CharField(required=True)  # The user's current password for verification
    new_password = serializers.CharField(required=True)  # The new password they want to switch to


# Handles new account sign-ups — includes password confirmation and email uniqueness checks
class RegisterSerializer(serializers.ModelSerializer):
    # Handle user registration logic. 
    # Confirm passwords match before saving.
    password = serializers.CharField(write_only=True)          # Never send the password back in a response
    password_confirm = serializers.CharField(write_only=True)  # Just for matching — discarded before saving

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        # Reject immediately if the two passwords the user typed don't match each other
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match.")
        
        # Check if email is already in use
        if User.objects.filter(email=data['email']).exists():
            # Raise a field-level error so the app can highlight the email input specifically
            raise serializers.ValidationError({"email": "A user with this email already exists."})
            
        return data

    def create(self, validated_data):
        # Strip out password_confirm — Django's create_user doesn't know what to do with it
        validated_data.pop('password_confirm')
        # Use create_user so the password gets properly hashed (never store plain text!)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        # Create a fresh profile for every new user that registers
        Profile.objects.get_or_create(user=user)
        return user
# Exposes the full public/private profile view — used on both the profile page and admin panel
class ProfileSerializer(serializers.ModelSerializer):
    # Structure user profile data.
    # Pull the username across from the related User model so the app doesn't need a second request
    username = serializers.CharField(source='user.username', read_only=True)
    response_time = serializers.CharField(read_only=True)  # Computed by the backend based on message timestamps

    class Meta:
        model = Profile
        fields = ('id', 'user', 'username', 'trust_score', 'is_verified', 'profile_picture', 'verification_document', 'wallet_balance', 'bio', 'location', 'phone_number', 'response_time')
        # These are system-controlled — the user can't bump their own trust score or wallet balance
        read_only_fields = ('user', 'trust_score', 'is_verified', 'wallet_balance', 'response_time')

# Simple read-only serializer that powers the category filter chips on the Home screen
class CategorySerializer(serializers.ModelSerializer):
    # Format item categories.
    class Meta:
        model = Category
        fields = ('id', 'name', 'icon_name')  # icon_name maps to a React Native vector icon string


# Handles individual photo attachments on a listing — nested inside ItemSerializer
class ItemImageSerializer(serializers.ModelSerializer):
    # Format individual item images.
    # Provide a full absolute URL alongside the raw file field so the app can render it directly
    image_url = serializers.SerializerMethodField()
    class Meta:
        model = ItemImage
        fields = ('id', 'image', 'image_url', 'created_at')
    
    # Build a fully qualified URL the mobile app can hit, including the server's domain
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                # Use the incoming request object to construct the absolute URL (e.g. http://192.168.x.x:8000/media/...)
                return request.build_absolute_uri(obj.image.url)
            # Fallback to relative path if request is missing (should be handled by client)
            return obj.image.url
        return None

# The main listing serializer — used for browsing, creating, and editing items
class ItemSerializer(serializers.ModelSerializer):
    # Detailed item data structure. 
    # Manage image uploads and grade display.

    # Flatten seller info so the app gets everything in one response instead of making extra calls
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_trust_score = serializers.FloatField(source='seller.profile.trust_score', read_only=True)
    seller_sales_count = serializers.SerializerMethodField()  # Calculated dynamically — see getter below
    seller_location = serializers.CharField(source='seller.profile.location', read_only=True)
    seller_profile_picture = serializers.SerializerMethodField()  # Needs absolute URL, hence a getter
    seller_response_time = serializers.CharField(source='seller.profile.response_time', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)  # Readable label alongside the category FK
    images = ItemImageSerializer(many=True, read_only=True)  # Nested list of all photos attached to this listing
    display_image = serializers.SerializerMethodField()  # The single hero image shown on listing cards

    # We'll handle this manually in create to support multiple files in multipart
    # write_only so these raw file objects are never sent back in responses
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Item
        fields = (
            'id', 'seller', 'seller_name', 'seller_trust_score', 'seller_sales_count', 'seller_location',
            'seller_profile_picture', 'seller_response_time', 'category', 'category_name',
            'name', 'description', 'price', 'weight', 'eco_impact', 'is_negotiable',
            'brand', 'original_price',
            'is_fully_functional', 'has_scratches', 'has_dents_cracks', 
            'has_original_box', 'has_receipt',
            'is_clean', 'has_all_accessories', 'has_repair_history', 
            'battery_health_good', 'is_modified',
            'calculated_grade', 'is_sold', 'view_count', 'flaw_disclosure', 'images', 'display_image', 'uploaded_images', 'created_at'
        )
        read_only_fields = ('seller', 'calculated_grade', 'images', 'view_count')

    def validate(self, attrs):
        # DIPLOMA FYP COMMENT:
        # We need to translate the frontend's positive checklist values to our backend's database representation.
        # On the frontend form, the user ticks "Pristine Screen (no scratches)" as True.
        # But in our Django database, the field is "has_scratches".
        # So we invert the boolean (True becomes False, and vice-versa) before validation and saving!

        # If the seller says the screen is pristine (True), the DB should store has_scratches=False
        if 'has_scratches' in attrs:
            attrs['has_scratches'] = not attrs['has_scratches']
        # Same logic — "no dents" checkbox becomes has_dents_cracks=False in the database
        if 'has_dents_cracks' in attrs:
            attrs['has_dents_cracks'] = not attrs['has_dents_cracks']
        # "Never repaired" on the form → has_repair_history=False in the DB
        if 'has_repair_history' in attrs:
            attrs['has_repair_history'] = not attrs['has_repair_history']
        # "Unmodified" on the form → is_modified=False in the DB
        if 'is_modified' in attrs:
            attrs['is_modified'] = not attrs['is_modified']
        return attrs

    # Override to_representation so the outgoing JSON matches what the React Native form expects
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # DIPLOMA FYP COMMENT:
        # Conversely, when sending data back from the DB to the mobile app, we convert it back
        # to the positive checkbox representation (e.g. if the item has_scratches=False, we return has_scratches=True
        # so the React Native UI can check the "Pristine" checkbox correctly!).

        # DB says has_scratches=False → send True to the app so the "Pristine" tick box stays checked
        if 'has_scratches' in ret:
            ret['has_scratches'] = not instance.has_scratches
        # DB says has_dents_cracks=False → send True so the "No Dents" box stays checked
        if 'has_dents_cracks' in ret:
            ret['has_dents_cracks'] = not instance.has_dents_cracks
        # DB says has_repair_history=False → send True so the "Never Repaired" box stays checked
        if 'has_repair_history' in ret:
            ret['has_repair_history'] = not instance.has_repair_history
        # DB says is_modified=False → send True so the "Unmodified" box stays checked
        if 'is_modified' in ret:
            ret['is_modified'] = not instance.is_modified
        return ret

    # Return how many sales this seller has actually completed — used to calculate ABI Ability score
    def get_seller_sales_count(self, obj):
        # If the queryset already prefetched completed_sales (e.g. via annotate), use that to avoid an extra query
        if hasattr(obj.seller, 'completed_sales'):
            return len(obj.seller.completed_sales)
        # Otherwise fall back to a fresh DB query filtering only COMPLETED transactions
        return obj.seller.sales.filter(status='COMPLETED').count()

    # Build an absolute URL for the seller's avatar so the app can load it straight from S3/media server
    def get_seller_profile_picture(self, obj):
        if hasattr(obj.seller, 'profile') and obj.seller.profile.profile_picture:
            request = self.context.get('request')
            if request:
                # Prefix with the server's host so it's a fully usable URL on the mobile app
                return request.build_absolute_uri(obj.seller.profile.profile_picture.url)
            return obj.seller.profile.profile_picture.url
        # Return None if the seller hasn't uploaded a profile picture yet
        return None

    # Picks the hero image that appears on listing browse cards and in search results
    def get_display_image(self, obj):
        # Return first image if available from prefetched list
        images = list(obj.images.all())
        first_image = images[0] if images else None
        if (first_image and first_image.image):
            request = self.context.get('request')
            if request:
                # Turn the media-relative path into a full URL the app can display
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        
        # Fallback to high-quality Unsplash images based on category (using shared helper)
        # This keeps listings looking polished even when a seller hasn't uploaded any photos
        category_name = obj.category.name if obj.category else 'Tech'
        return get_fallback_category_image(category_name)

    # Custom create so we can handle the multipart image uploads separately from the JSON fields
    def create(self, validated_data):
        # Pop uploaded_images if present in validated_data
        # Note: In multipart, ListField might not always populate correctly depending on the parser
        validated_data.pop('uploaded_images', [])  # Remove it so Item.objects.create doesn't choke on an unexpected field
        
        # Get files directly from the request context if possible
        request = self.context.get('request')
        files = []
        if request and request.FILES:
            # Grab all files the seller uploaded under the 'uploaded_images' key
            files = request.FILES.getlist('uploaded_images')

        # Save the item record first so we have a PK to attach images to
        item = Item.objects.create(**validated_data)
        # Create a separate ItemImage record for every file the seller submitted
        for image in files:
            ItemImage.objects.create(item=item, image=image)
        return item


# Tracks every buy/sell event in the marketplace — creation, status changes, and payment validation all go through here
class TransactionSerializer(serializers.ModelSerializer):
    # Format sale transaction data.
    # Flatten human-readable labels so the order history screen doesn't need extra lookups
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_id = serializers.IntegerField(source='item.id', read_only=True)  # Handy for deep-linking to the item detail screen
    item_display_image = serializers.SerializerMethodField()  # Show a thumbnail next to the order in purchase history

    class Meta:
        model = Transaction
        fields = (
            'id', 'item', 'item_id', 'item_name', 'item_display_image', 'buyer', 'buyer_name', 
            'seller', 'seller_name', 'final_price', 'offer_price', 'payment_method', 'status', 
            'created_at', 'updated_at'
        )
        # buyer/seller are set server-side from the auth token; final_price is computed by the signal
        read_only_fields = ('buyer', 'seller', 'final_price')

    def validate(self, attrs):
        # Read which status the client is trying to set on this transaction
        status = attrs.get('status')
        # Determine the payment method chosen (defaulting to the existing value if this is an update)
        payment_method = attrs.get('payment_method', self.instance.payment_method if self.instance else 'WALLET')
        
        # We only enforce wallet balance checks if the payment method chosen is WALLET
        if payment_method == 'WALLET':
            # On update to COMPLETED
            if self.instance and status == 'COMPLETED' and self.instance.status != 'COMPLETED':
                # Look up the buyer's current wallet balance so we can validate it
                buyer_profile = self.instance.buyer.profile
                # Honour the negotiated offer price if one exists, otherwise use the listed price
                price = self.instance.offer_price if self.instance.offer_price is not None else self.instance.final_price
                # Block the status update if the buyer's wallet can't cover the purchase
                if buyer_profile.wallet_balance < price:
                    raise serializers.ValidationError({"status": "Insufficient wallet balance to complete this transaction."})
            # On creation as COMPLETED
            elif not self.instance and status == 'COMPLETED':
                # Pull the buyer's identity from the request's auth token
                request = self.context.get('request')
                user = request.user if request and request.user.is_authenticated else None
                if not user:
                    # Last resort fallback — should rarely happen in a properly authenticated session
                    from django.contrib.auth.models import User
                    user = User.objects.first()
                if user:
                    buyer_profile = user.profile
                    item = attrs.get('item')
                    offer_price = attrs.get('offer_price')
                    # If the buyer made a counter-offer, check against that; otherwise use the listing price
                    price = offer_price if offer_price is not None else item.price
                    # Reject the transaction right here if the wallet balance is too low
                    if buyer_profile.wallet_balance < price:
                        raise serializers.ValidationError("Insufficient wallet balance.")
        return attrs

    # Grab the thumbnail for the purchased item so order history cards aren't blank
    def get_item_display_image(self, obj):
        # Return first image if available from prefetched list
        images = list(obj.item.images.all())
        first_image = images[0] if images else None
        if (first_image and first_image.image):
            request = self.context.get('request')
            if request:
                # Convert the media path to a full URL the app can display in the order card
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        
        # Fallback to high-quality Unsplash images based on category (using shared helper)
        category_name = obj.item.category.name if obj.item.category else 'Tech'
        return get_fallback_category_image(category_name)


# Powers the in-app chat — supports plain messages, price offers, and displaying the item being discussed
class MessageSerializer(serializers.ModelSerializer):
    # Format in app chat messages.
    # Include sender/receiver names so the chat bubble UI can label messages without extra API calls
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)
    # Attach the item name and price so the chat header shows what the conversation is about
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)
    item_display_image = serializers.SerializerMethodField()  # Thumbnail shown in the chat header banner

    class Meta:
        model = Message
        fields = ('id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'item', 'item_name', 'item_price', 'item_display_image', 'content', 'timestamp', 'is_read', 'is_offer', 'offer_price', 'offer_status')
        # Sender is derived from the auth token — clients can't spoof who sent the message
        read_only_fields = ('sender',)

    # Show a small photo of the item being discussed at the top of the chat thread
    def get_item_display_image(self, obj):
        if obj.item:
            images = list(obj.item.images.all())
            first_image = images[0] if images else None
            if first_image and first_image.image:
                request = self.context.get('request')
                if request:
                    # Build the full URL so the image tag in React Native can load it directly
                    return request.build_absolute_uri(first_image.image.url)
                return first_image.image.url
            # Fallback to high-quality Unsplash images based on category (using shared helper)
            category_name = obj.item.category.name if obj.item.category else 'Tech'
            return get_fallback_category_image(category_name)
        # If the message somehow has no associated item, return None gracefully
        return None


# Lets buyers flag suspicious sellers — reviewed by admins before any action is taken
class ScamReportSerializer(serializers.ModelSerializer):
    # Structure fraud report data.
    # Show human-readable names so the admin panel doesn't just show user IDs
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    reported_user_name = serializers.CharField(source='reported_user.username', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)  # So the admin can see which listing triggered the report

    class Meta:
        model = ScamReport
        fields = (
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'item', 'item_name', 'reason', 'status', 'created_at', 'updated_at'
        )
        # reporter is set from the auth token; status is only changed by admin actions
        read_only_fields = ('reporter', 'status')


# Handles post-purchase star ratings and comments — feeds directly into the ABI Benevolence calculation
class ReviewSerializer(serializers.ModelSerializer):
    # Format seller feedback.
    # Show names alongside IDs so the review card UI can attribute the feedback without extra queries
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'item', 'reviewer', 'reviewer_name', 'seller', 'seller_name', 'rating', 'comment', 'created_at')
        # reviewer is always the logged-in buyer — they can't review on someone else's behalf
        read_only_fields = ('reviewer',)


# Drives the Updates tab — push-style alerts for offers, sales, and reviews
class NotificationSerializer(serializers.ModelSerializer):
    # Structure user alert data.
    class Meta:
        model = Notification
        # related_id is used for deep-linking — the app routes to the right screen based on this value
        fields = ('id', 'title', 'content', 'is_read', 'related_id', 'created_at')


# Powers the wishlist/saved-items feature — keeps enough item info to render each card without a join
class FavoriteSerializer(serializers.ModelSerializer):
    # Inline the item name and price so the Favorites screen doesn't need a separate items request
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.CharField(source='item.price', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ('id', 'user', 'item', 'item_name', 'item_price', 'created_at')
        # user is always the person currently authenticated — prevents saving to someone else's wishlist
        read_only_fields = ('user',)


# Records every credit and debit on the in-app wallet — top-ups, purchases, and refunds all show up here
class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        # tx_type distinguishes CREDIT vs DEBIT so the wallet history screen can colour-code entries
        fields = ('id', 'amount', 'tx_type', 'description', 'created_at')
        # id and timestamp are assigned by the DB — clients never set these
        read_only_fields = ('id', 'created_at')


# Lets sellers group multiple listings into a discounted bundle deal
class BundleSerializer(serializers.ModelSerializer):
    # Show the seller's username so the bundle card can display "Sold by X" without an extra request
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    # Nest full ItemSerializer output so the bundle detail screen gets complete info on every included listing
    item_details = ItemSerializer(source='items', many=True, read_only=True)

    class Meta:
        model = Bundle
        # 'items' holds the list of PKs for write operations; 'item_details' is the rich read-only expansion
        fields = ('id', 'seller', 'seller_name', 'name', 'items', 'item_details', 'price', 'created_at')
        # seller is inferred from the auth token when the bundle is created
        read_only_fields = ('seller',)


# Notifies buyers when a saved item drops to or below their target price
class PriceAlertSerializer(serializers.ModelSerializer):
    # Include the item's current name and price so the alert row shows useful context
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.DecimalField(source='item.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PriceAlert
        # target_price is what the buyer set; item_price is the live listing price for comparison
        fields = ('id', 'user', 'item', 'item_name', 'item_price', 'target_price', 'created_at')
        # user is always the authenticated buyer — alerts are personal and can't be created for others
        read_only_fields = ('user',)


# Records when a user blocks another — the blocked party no longer appears in listings or chat for the blocker
class BlockSerializer(serializers.ModelSerializer):
    # Show the blocked person's username so the block list is readable and not just a list of IDs
    blocked_username = serializers.CharField(source='blocked.username', read_only=True)

    class Meta:
        model = Block
        fields = ('id', 'blocker', 'blocked', 'blocked_username', 'created_at')
        # blocker is taken from the auth token — you can only create blocks on your own behalf
        read_only_fields = ('blocker',)
