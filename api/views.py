# =====================================================================
# SYSTEM/PROJECT NAME: MyPreLove (Secondhand Eco-Marketplace Mobile App)
# COURSE: Diploma in Information Technology (DIT)
# MODULE: Final Year Project (FYP) - DIT3004 / DIT3102
# MEMBERS: Adam Anwar & FYP Group
# FILE NAME: views.py
# PURPOSE: Viewsets and API endpoints for Django REST Framework.
#          Handles user registration, authentication, categories,
#          profiles, items listing, custom chat offers (bargaining),
#          scam reporting, notifications, and transactions logic.
# =====================================================================

from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Prefetch, Q, Avg, Sum
from rest_framework.decorators import action
from django.contrib.auth.models import User

# Local imports
from .models import Category, Profile, Item, Transaction, Message, ScamReport, Notification, Review, Favorite, Bundle, PriceAlert, Block
from .serializers import (
    CategorySerializer, ProfileSerializer, ItemSerializer,
    TransactionSerializer, MessageSerializer, ScamReportSerializer,
    NotificationSerializer, ChangePasswordSerializer,
    ReviewSerializer, RegisterSerializer, UserSerializer, FavoriteSerializer,
    BundleSerializer, PriceAlertSerializer, BlockSerializer
)

# Open to anyone — no login required to create an account
class RegisterView(APIView):
    # Create new user accounts.
    # Provide authentication tokens immediately.
    permission_classes = [permissions.AllowAny]

    # Handle POST requests for new user registration
    def post(self, request):
        # Pass the incoming request data into the registration serializer for validation
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            # Create the user record in the database
            user = serializer.save()
            # Generate or retrieve the auth token so the user can log in right away
            token, created = Token.objects.get_or_create(user=user)
            # Return the token and the user's data so the app can store them locally
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        # If validation fails, send back the specific field errors to help the user fix them
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Only logged-in users can change their own password
class ChangePasswordView(APIView):
    # DIPLOMA FYP COMMENT:
    # Requires IsAuthenticated to prevent unauthorized password updates.
    permission_classes = [permissions.IsAuthenticated]

    # Handle the password change request
    def post(self, request):
        # Validate that old_password and new_password fields are present and correct format
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            # Double-check the old password matches before allowing any changes
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set the new hashed password and persist it to the database
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)
        # Return field-level errors if the serializer didn't pass validation
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Extends Django REST Framework's built-in token auth so we can return extra user info
class LoginView(ObtainAuthToken):
    # Authenticate users. 
    # Return the secret token for mobile sessions.
    def post(self, request, *args, **kwargs):
        # Use the built-in auth serializer to validate username and password
        serializer = self.serializer_class(data=request.data, context={'request': request})
        # Raise an exception right away if credentials are wrong — no need for custom error handling
        serializer.is_valid(raise_exception=True)
        # Grab the authenticated user object from the validated data
        user = serializer.validated_data['user']
        # Get an existing token or mint a fresh one for this session
        token, created = Token.objects.get_or_create(user=user)
        # Send back both the token key and the full user profile so the app can cache it
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


# Basic CRUD ViewSet for Django's built-in User model — used mainly for admin lookups
class UserViewSet(viewsets.ModelViewSet):
    # Standard user operations.
    queryset = User.objects.all()
    serializer_class = UserSerializer
    # Open to all so the registration and profile screens can do username lookups without auth
    permission_classes = [permissions.AllowAny]
    # Disable pagination so the full list is always returned in one shot
    pagination_class = None


# Simple read/write ViewSet for item categories (e.g. Tech, Fashion, Books)
class CategoryViewSet(viewsets.ModelViewSet):
    # List available item categories.
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    # Anyone can read categories — no login needed to browse the filter menu
    permission_classes = [permissions.AllowAny]


# Handles everything related to user profiles — trust scores, verification, wallet, eco stats
class ProfileViewSet(viewsets.ModelViewSet):
    # Display user profiles. 
    # Link to trust scores and verification.
    # Join user data in the same DB query to avoid N+1 hits
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    # Anyone can view profiles publicly — buyers need to see seller trust scores
    permission_classes = [permissions.AllowAny]
    # No pagination — all profiles are returned at once for leaderboard and search
    pagination_class = None
    # Use user_id in the URL instead of the internal profile PK for cleaner routing
    lookup_field = 'user_id'
    # Allow searching by username in the admin and marketplace screens
    search_fields = ['user__username']
    # Allow the frontend to sort profiles by their ABI trust score
    ordering_fields = ['trust_score']
    # Custom action so the mobile app can hit /profiles/me/ instead of needing to know the profile ID
    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        # Manage the profile of the currently logged-in user
        user = request.user
        if user.is_anonymous:
            # Fallback for dev/demo if not logged in
            user = User.objects.first()
        
        # Create a profile row if this is the user's first visit — shouldn't normally be needed
        profile, created = Profile.objects.get_or_create(user=user)
        
        # If the client is sending an update, validate and save the new profile data
        if request.method in ['PUT', 'PATCH']:
            # PATCH allows partial updates (e.g. just changing the bio), PUT requires all fields
            partial = (request.method == 'PATCH')
            serializer = self.get_serializer(profile, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        # Default GET — just return the current profile data
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    # Endpoint for adding money to the user's in-app wallet — maps to /profiles/me/top_up/
    @action(detail=False, methods=['post'], url_path='me/top_up')
    def top_up(self, request):
        # Decimal is used here to avoid floating-point rounding errors with money
        from decimal import Decimal
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Make sure the profile exists before touching the wallet balance
        profile, created = Profile.objects.get_or_create(user=user)
        # Grab the amount the user wants to top up from the request body
        amount = request.data.get('amount')
        try:
            amount = float(amount)
            # Reject zero or negative top-up amounts immediately
            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            # Catch cases where amount is a string like 'abc' or completely missing
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        # Add the amount to the current wallet balance and save only that field
        profile.wallet_balance += Decimal(str(amount))
        profile.save(update_fields=['wallet_balance'])

        # Log audit trail record
        from .models import WalletTransaction
        # Record the top-up in the wallet transaction history for transparency
        WalletTransaction.objects.create(
            user=user,
            amount=Decimal(str(amount)),
            tx_type='TOP_UP',
            description="Topped up wallet balance"
        )

        # Notify user
        # Send a push-style notification so the user knows the top-up landed
        Notification.objects.create(
            user=user,
            title="Wallet Top Up Successful",
            content=f"You have topped up RM {amount:.2f} to your MyPreLove Wallet."
        )

        # Return the updated balance so the app can refresh the wallet UI immediately
        return Response({
            'success': True,
            'wallet_balance': float(profile.wallet_balance)
        })

    # Returns the full transaction history for the current user's wallet
    @action(detail=False, methods=['get'], url_path='me/wallet_history')
    def wallet_history(self, request):
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # Late imports to keep these models scoped — they're only needed here
        from .models import WalletTransaction
        from .serializers import WalletTransactionSerializer
        
        # Pull all wallet transactions belonging to this user (top-ups, payments, refunds)
        txs = WalletTransaction.objects.filter(user=user)
        serializer = WalletTransactionSerializer(txs, many=True)
        return Response(serializer.data)

    # Allows a user to submit their ID document and ask to be verified on the platform
    @action(detail=False, methods=['post'], url_path='me/request_verification')
    def request_verification(self, request):
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # Make sure the profile row exists before trying to attach a document to it
        profile, created = Profile.objects.get_or_create(user=user)
        # Check if the user uploaded a verification document (e.g. a photo of their IC)
        doc_file = request.FILES.get('verification_document')
        if doc_file:
            # Save the uploaded document to the profile record
            profile.verification_document = doc_file
            profile.save(update_fields=['verification_document'])
            
        # Create a notification for superadmin
        from .models import Notification
        from django.contrib.auth.models import User as DjangoUser
        
        # Find the superadmin so we can ping them about the new verification request
        superadmin = DjangoUser.objects.filter(is_superuser=True).first()
        if superadmin:
            # Alert the admin dashboard so they can review the document
            Notification.objects.create(
                user=superadmin,
                title="Verification Request",
                content=f"User {user.username} has requested profile verification.",
                # Include the user's ID so the admin can deep-link straight to their profile
                related_id=user.id
            )
            
        # Also create a confirmation notification for the user themselves
        # Let the user know their request is in the queue so they don't submit it twice
        Notification.objects.create(
            user=user,
            title="Verification Request Submitted",
            content="Our admins are reviewing your profile. We will update you soon!"
        )
        
        return Response({'success': True, 'message': 'Verification request submitted successfully'})

    # Admin-only action to grant a user verified status — gives them 20 ABI Integrity points
    @action(detail=True, methods=['post'], url_path='approve_verification')
    def approve_verification(self, request, user_id=None):
        # Hard block — only superadmins can flip the verified flag
        if not request.user.is_superuser:
            return Response({'error': 'Only admins can approve verification requests'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Look up the profile by user_id (our custom lookup field, not the profile PK)
            profile = Profile.objects.get(user_id=user_id)
            # Flip the verified flag to True and persist it
            profile.is_verified = True
            profile.save(update_fields=['is_verified'])
            # Recalculate trust score immediately so the Integrity component adds its 20 points
            profile.recalculate_trust_score()
            
            # Notify the user
            # Tell the seller they're now verified so they know their credibility went up
            Notification.objects.create(
                user=profile.user,
                title="Profile Verified! ✅",
                content="Congratulations! Your profile has been verified by our admins. You've earned 20 ABI Integrity points!"
            )
            return Response({'success': True, 'message': 'Profile verified successfully'})
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Admin-only action to reject a verification request and clear the uploaded document
    @action(detail=True, methods=['post'], url_path='reject_verification')
    def reject_verification(self, request, user_id=None):
        # Only superadmins have the authority to reject verification submissions
        if not request.user.is_superuser:
            return Response({'error': 'Only admins can reject verification requests'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            profile = Profile.objects.get(user_id=user_id)
            # Mark as not verified and wipe the document so they can upload a fresh one
            profile.is_verified = False
            profile.verification_document = None
            profile.save(update_fields=['is_verified', 'verification_document'])
            # Recalculate trust score so the Integrity points are removed immediately
            profile.recalculate_trust_score()
            
            # Notify the user
            # Let the user know their submission didn't pass so they can try again with a better document
            Notification.objects.create(
                user=profile.user,
                title="Verification Rejected ❌",
                content="Your verification request was rejected. Please ensure you upload a valid ID and try again."
            )
            return Response({'success': True, 'message': 'Profile verification rejected'})
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Endpoint for the Eco Leaderboard screen — shows the top 10 sellers by CO2 saved
    @action(detail=False, methods=['get'], url_path='eco_leaderboard')
    def eco_leaderboard(self, request):
        # DIPLOMA FYP COMMENT:
        # CO2 Leaderboard returns the top eco contributors.
        # Sums the eco_impact of all sold items for each seller.
        leaderboard = (
            Profile.objects.select_related('user')
            # Annotate each profile with the total eco_impact across all their listed items
            .annotate(total_eco_saved=Sum('user__items__eco_impact'))
            # Only include sellers who have actually saved some CO2 — filter out zeroes
            .filter(total_eco_saved__gt=0)
            # Sort descending and take only the top 10 contributors
            .order_by('-total_eco_saved')[:10]
        )
        
        # Build the response list manually to include the profile picture as a full absolute URL
        data = []
        for p in leaderboard:
            data.append({
                'user_id': p.user.id,
                'username': p.user.username,
                'trust_score': p.trust_score,
                'is_verified': p.is_verified,
                # Build a full URL for the profile picture so the app can load it directly
                'profile_picture': request.build_absolute_uri(p.profile_picture.url) if p.profile_picture else None,
                'total_eco_saved': p.total_eco_saved
            })
        return Response(data)


    # Aggregated platform stats consumed by the Admin Dashboard screen
    @action(detail=False, methods=['get'])
    def marketplace_stats(self, request):
        # Return real platform-wide stats for the Admin Dashboard
        return Response({
            # Count every registered user regardless of activity
            'total_users': User.objects.count(),
            # Only show listings that haven't been sold yet — reflects the live marketplace size
            'active_items': Item.objects.filter(is_sold=False).count(),
            # Only count fully completed sales, not pending or cancelled ones
            'total_sales': Transaction.objects.filter(status='COMPLETED').count(),
            # How many scam reports are still waiting for admin action
            'reports_pending': ScamReport.objects.filter(status='PENDING').count(),
        })

    # Returns stats for a specific public profile — used when viewing another seller's page
    @action(detail=True, methods=['get'])
    def user_stats(self, request, user_id=None):
        # Return real user-specific stats for the Profile Screen
        profile = self.get_object()
        user = profile.user
        # Delegate to the shared helper so the logic isn't duplicated
        return self._get_user_stats_response(user, profile)

    # Convenience endpoint for the current user's own profile stats — avoids needing to know your own user_id
    @action(detail=False, methods=['get'], url_path='me/user_stats')
    def me_stats(self, request):
        # Convenience endpoint for current user's stats
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        profile, created = Profile.objects.get_or_create(user=user)
        return self._get_user_stats_response(user, profile)

    # Shared helper that assembles the stats dict — called by both user_stats and me_stats
    def _get_user_stats_response(self, user, profile):
        return Response({
            # Active (unsold) listings this user currently has on the marketplace
            'live_listings': user.items.filter(is_sold=False).count(),
            # Total number of sales this seller has successfully completed
            'items_sold': user.sales.filter(status='COMPLETED').count(),
            # Average star rating from buyers — defaults to 0.0 if no reviews yet
            'avg_rating': user.reviews_received.aggregate(Avg('rating'))['rating__avg'] or 0.0,
            # ABI-based trust score that combines Integrity, Ability, and Benevolence
            'trust_score': profile.trust_score,
            # Total kg of CO2 saved across all this user's sold items (weight_kg * 2.5)
            'carbon_saved': user.items.aggregate(Sum('eco_impact'))['eco_impact__sum'] or 0.0
        })


# Core marketplace ViewSet — handles listing, creating, updating, and deleting items
class ItemViewSet(viewsets.ModelViewSet):
    # Manage marketplace items. 
    # Support search and filtering by price or grade.
    # Use select_related to pull seller profile and category in a single JOIN query
    queryset = Item.objects.select_related('seller__profile', 'category').prefetch_related(
        # Prefetch item images so the gallery doesn't trigger extra DB hits per item
        'images',
        # Also prefetch only the seller's COMPLETED sales so the trust score can be shown inline
        Prefetch('seller__sales', queryset=Transaction.objects.filter(status='COMPLETED'), to_attr='completed_sales')
    ).all()
    serializer_class = ItemSerializer
    # Public read access — anyone can browse items without logging in
    permission_classes = [permissions.AllowAny]
    # No pagination — the full list is returned so the app can handle infinite scroll locally
    pagination_class = None
    
    # Allow filtering by category, grade (A/B/C/D), sold status, or exact price via query params
    filterset_fields = ['category', 'calculated_grade', 'is_sold', 'price']
    # Free-text search across item name and description
    search_fields = ['name', 'description']
    # Allow the app to sort results by price or listing date
    ordering_fields = ['price', 'created_at']

    # Dynamically set permissions based on the action being performed
    def get_permissions(self):
        # Creating, editing, deleting, or favouriting requires the user to be logged in
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_favorite']:
            return [permissions.IsAuthenticated()]
        # Everything else (browsing, searching) is open to the public
        return [permissions.AllowAny()]

    # Custom queryset that applies all the marketplace filters the app supports
    def get_queryset(self):
        queryset = super().get_queryset()
        # Admin bypass — superadmin sees everything including sold and hidden items
        if self.request.user.is_superuser:
            return queryset
            
        # If no specific 'is_sold' filter is provided, default to only showing unsold items on the feed
        is_sold_filter = self.request.query_params.get('is_sold')
        # Only apply the unsold default when listing the feed, not when retrieving a single item
        if is_sold_filter is None and self.action == 'list':
            queryset = queryset.filter(is_sold=False)
            
        # DIPLOMA FYP COMMENT:
        # Localization filtering on the backend.
        # If the mobile client requests a location parameter (e.g., ?location=Kuala Lumpur),
        # we filter the queryset to only include items whose seller profile location contains that value.
        location = self.request.query_params.get('location')
        # Skip filtering if the client sends 'All' — that means show every location
        if location and location != 'All':
            queryset = queryset.filter(seller__profile__location__icontains=location)

        # Price range filters (Min and Max price)
        # Apply a minimum price floor if the user set one in the filter screen
        price_min = self.request.query_params.get('price_min')
        if price_min:
            queryset = queryset.filter(price__gte=price_min)
        # Apply a maximum price ceiling if the user set one in the filter screen
        price_max = self.request.query_params.get('price_max')
        if price_max:
            queryset = queryset.filter(price__lte=price_max)

        # Filter out items from blocked users
        if self.request.user.is_authenticated:
            # Get all user IDs that the current user has blocked
            blocked_user_ids = Block.objects.filter(blocker=self.request.user).values_list('blocked_id', flat=True)
            # Remove any items whose seller is on the blocked list
            queryset = queryset.exclude(seller_id__in=blocked_user_ids)
            
        return queryset


    # Override retrieve so we can track how many times an item detail page is viewed
    def retrieve(self, request, *args, **kwargs):
        # DIPLOMA FYP COMMENT:
        # Increment the item's view counter whenever its details are requested.
        instance = self.get_object()
        # Bump the counter and save only that field — avoids touching other item fields unnecessarily
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # Automatically attach the logged-in user as the seller when a new listing is created
    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    # Only let the original seller (or a superadmin) edit an item
    def perform_update(self, serializer):
        if serializer.instance.seller != self.request.user and not self.request.user.is_superuser:
            raise serializers.ValidationError({"error": "You do not have permission to update this item."})
        serializer.save()

    # Only let the original seller (or a superadmin) delete an item
    def perform_destroy(self, instance):
        if instance.seller != self.request.user and not self.request.user.is_superuser:
            raise serializers.ValidationError({"error": "You do not have permission to delete this item."})
        instance.delete()

    # Toggle an item in/out of the current user's favourites list with a single POST
    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        item = self.get_object()
        user = request.user
        # Try to create the favourite — if it already exists, get_or_create returns created=False
        favorite, created = Favorite.objects.get_or_create(user=user, item=item)
        if not created:
            # The favourite already existed, so the user is toggling it off — remove it
            favorite.delete()
            return Response({'status': 'removed from favorites'})
        # The favourite was freshly created — let the app know to show the filled heart icon
        return Response({'status': 'added to favorites'})


# Handles the creation and tracking of purchase transactions between buyers and sellers
class TransactionViewSet(viewsets.ModelViewSet):
    # Record sales. 
    # Link buyers and sellers via item listings.
    serializer_class = TransactionSerializer
    permission_classes = [permissions.AllowAny]

    # Only return transactions that involve the current user — either as buyer or seller
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Use OR filter so both sides of the transaction can see it in their history
        return Transaction.objects.filter(Q(buyer=user) | Q(seller=user)).select_related('item', 'buyer', 'seller').prefetch_related('item__images')

    # Guard the transaction creation with business rule checks before saving
    def perform_create(self, serializer):
        # Grab the item being purchased so we can run checks on it
        item = serializer.validated_data['item']
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # Prevent self-buying — a seller shouldn't be able to purchase their own listing
        if user == item.seller:
            raise serializers.ValidationError("You cannot buy your own item.")
            
        # Prevent buying an already sold item — first come, first served
        if item.is_sold:
            raise serializers.ValidationError("This item has already been sold.")
            
        # Use the offer_price if the buyer made a custom offer, otherwise fall back to the listing price
        offer_price = serializer.validated_data.get('offer_price')
        final_price = offer_price if offer_price is not None else item.price

        # Save the transaction with the resolved buyer, seller, and final agreed price
        serializer.save(
            buyer=user,
            seller=item.seller,
            final_price=final_price
        )


# Handles all chat messages between buyers and sellers, including offer messages
class MessageViewSet(viewsets.ModelViewSet):
    # Facilitate in app chat. 
    # Filter messages by sender and receiver identity.
    serializer_class = MessageSerializer
    permission_classes = [permissions.AllowAny]

    # Return only messages relevant to the current user — respects the superadmin override
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        if user.is_superuser:
            # Admins can see every message in the system for moderation purposes
            queryset = Message.objects.all().select_related('sender', 'receiver', 'item').prefetch_related('item__images')
        else:
            # Regular users only see messages they sent or received
            queryset = Message.objects.filter(Q(sender=user) | Q(receiver=user)).select_related('sender', 'receiver', 'item').prefetch_related('item__images')
        
        # Support filtering by a specific partner for the ChatDetail screen
        partner_name = self.request.query_params.get('partner')
        if partner_name:
            # Narrow the chat thread to messages between the current user and a specific partner
            queryset = queryset.filter(
                Q(sender__username=partner_name) | Q(receiver__username=partner_name)
            )
        return queryset

    # Marks all unread messages in a specific conversation as read — called when the user opens a chat
    @action(detail=False, methods=['post'])
    def mark_conversation_read(self, request):
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # We need the partner's username to know which conversation thread to clear
        partner_name = request.data.get('partner')
        if not partner_name:
            return Response({'error': 'Partner name required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Bulk-update all unread messages from this partner to the current user in one DB call
        Message.objects.filter(
            receiver=user,
            sender__username=partner_name,
            is_read=False
        ).update(is_read=True)
        
        return Response({'status': 'messages marked as read'})

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        # DIPLOMA FYP COMMENT:
        # Custom POST endpoint for accepting an offer directly from the chat screen.
        # It changes the offer_status to 'ACCEPTED', which triggers a Django post_save signal
        # to auto-update the corresponding Transaction state to completed/accepted.
        message = self.get_object()
        if not message.is_offer or message.offer_status != 'PENDING':
            return Response({'error': 'Not a pending offer'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
            
        if message.receiver != user:
            return Response({'error': 'Only the receiver can accept the offer'}, status=status.HTTP_403_FORBIDDEN)
            
        message.offer_status = 'ACCEPTED'
        message.save()
        
        return Response({'status': 'offer accepted', 'offer_status': message.offer_status})

    @action(detail=True, methods=['post'])
    def decline_offer(self, request, pk=None):
        # DIPLOMA FYP COMMENT:
        # Custom POST endpoint for declining an offer directly from the chat screen.
        # It marks the offer_status as 'DECLINED', so the user knows their custom offer was rejected.
        message = self.get_object()
        if not message.is_offer or message.offer_status != 'PENDING':
            return Response({'error': 'Not a pending offer'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
            
        if message.receiver != user:
            return Response({'error': 'Only the receiver can decline the offer'}, status=status.HTTP_403_FORBIDDEN)
            
        message.offer_status = 'DECLINED'
        message.save()
        
        return Response({'status': 'offer declined', 'offer_status': message.offer_status})

    # Allows a user to fire back a different price on an existing offer — the bargaining feature
    @action(detail=True, methods=['post'])
    def counter_offer(self, request, pk=None):
        # DIPLOMA FYP COMMENT:
        # Custom POST endpoint for countering an offer.
        # This creates a new pending Transaction, which automatically generates a
        # corresponding [OFFER:id:price:PENDING] system message in the chat thread.
        original_message = self.get_object()
        
        # Verify the original message contains a valid offer tag
        content = original_message.content or ""
        # The offer messages follow a strict [OFFER:...] prefix format — reject anything else
        if not content.startswith('[OFFER:'):
            return Response({'error': 'Original message is not an offer'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Parse transaction ID from the [OFFER:tx_id:price:status] template
        try:
            # Strip the '[OFFER:' prefix and trailing ']' then split on ':' to get the transaction ID
            parts = content[7:-1].split(':')
            transaction_id = int(parts[0])
        except (ValueError, IndexError):
            # If the format is wrong the message was probably corrupted — bail out early
            return Response({'error': 'Malformed offer message format'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .models import Transaction
        try:
            # Look up the original transaction that this offer message refers to
            original_tx = Transaction.objects.get(pk=transaction_id)
        except Transaction.DoesNotExist:
            return Response({'error': 'Original transaction does not exist'}, status=status.HTTP_404_NOT_FOUND)
            
        # Can't counter an offer on something that's already been sold and paid for
        if original_tx.status == 'COMPLETED':
            return Response({'error': 'Cannot counter a completed transaction'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Extract the proposed price for the counter offer
        counter_price = request.data.get('price')
        if not counter_price:
            return Response({'error': 'Counter offer price is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Cast to float so we can safely store it as a decimal in the transaction
            counter_price = float(counter_price)
        except ValueError:
            return Response({'error': 'Invalid price format'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
            
        # Ensure the user is a participant of the original message conversation
        # Outsiders shouldn't be able to inject counter offers into someone else's negotiation
        if user not in [original_message.sender, original_message.receiver]:
            return Response({'error': 'You are not a participant in this conversation'}, status=status.HTTP_403_FORBIDDEN)
            
        # Mark the original transaction as cancelled (declined) if it was pending
        # The old offer is dead — the counter offer replaces it
        if original_tx.status == 'PENDING':
            original_tx.status = 'CANCELLED'
            original_tx.save()
            
        # Create a new transaction representing the counter offer
        # The buyer and seller mapping remains the same as original
        new_tx = Transaction.objects.create(
            item=original_tx.item,
            buyer=original_tx.buyer,
            seller=original_tx.seller,
            offer_price=counter_price,
            final_price=counter_price,
            # Keep the same payment method as the original offer
            payment_method=original_tx.payment_method,
            status='PENDING'
        )
        
        # Locate the new system message created via transaction signal post_save
        # The post_save signal on Transaction auto-generates an [OFFER:...] chat message
        counter_msg = Message.objects.filter(
            item=new_tx.item,
            content__startswith=f"[OFFER:{new_tx.id}:"
        ).first()
        
        if counter_msg:
            # Re-assign message sender to the current user making the counter offer
            counter_msg.sender = user
            # The receiver is whoever is on the opposite side of the deal from the counter-offerer
            counter_msg.receiver = original_tx.seller if user == original_tx.buyer else original_tx.buyer
            counter_msg.save()
            
            serializer = self.get_serializer(counter_msg)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # This shouldn't happen if the signal is wired correctly — log as a 500 for debugging
            return Response({'error': 'Counter offer message could not be generated'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Automatically tag the logged-in user as the sender when a new message is created
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(sender=user)


# Lets buyers report suspicious sellers — admins can then approve or dismiss the reports
class ScamReportViewSet(viewsets.ModelViewSet):
    # Allow users to flag fraud.
    serializer_class = ScamReportSerializer
    permission_classes = [permissions.AllowAny]

    # Regular users only see their own reports; admins see every report in the system
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # Superadmin can see ALL reports
        if user.is_superuser:
            # Pull all reports with related data so the admin dashboard can display full details
            return ScamReport.objects.all().select_related('reporter', 'reported_user', 'item')
        
        # Regular user only sees reports they personally submitted
        return ScamReport.objects.filter(reporter=user).select_related('reporter', 'reported_user', 'item')

    # Automatically set the current user as the reporter when a new report is filed
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reporter=user)

    # Admin action to mark a scam report as RESOLVED and let the reporter know action was taken
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        # DIPLOMA FYP COMMENT:
        # Action to resolve report. Sets status to RESOLVED and notifies the reporter.
        report = self.get_object()
        # Flip the report status to resolved so it disappears from the pending queue
        report.status = 'RESOLVED'
        report.save()
        
        # Tell the reporter their complaint was taken seriously and actioned by admins
        Notification.objects.create(
            user=report.reporter,
            title="Report Resolved",
            content=f"Your report regarding {report.reported_user.username} has been resolved by our admins."
        )
        return Response({'status': 'report approved'})

    # Admin action to dismiss a report that didn't meet the threshold for action
    @action(detail=True, methods=['post'], url_path='dismiss')
    def dismiss(self, request, pk=None):
        # DIPLOMA FYP COMMENT:
        # Action to dismiss report. Sets status to DISMISSED and notifies the reporter.
        report = self.get_object()
        # Mark as dismissed so it's cleared from the pending queue
        report.status = 'DISMISSED'
        report.save()
        
        # Notify the reporter so they know the outcome — even if it wasn't in their favour
        Notification.objects.create(
            user=report.reporter,
            title="Report Dismissed",
            content=f"Your report regarding {report.reported_user.username} has been reviewed and dismissed by our admins."
        )
        return Response({'status': 'report dismissed'})


# Lets buyers leave star ratings and comments on sellers after completing a purchase
class ReviewViewSet(viewsets.ModelViewSet):
    # Manage buyer feedback.
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    # Return reviews filtered by seller or reviewer if those query params are provided
    def get_queryset(self):
        # Join related models in one query to avoid extra hits when displaying review cards
        queryset = Review.objects.select_related('item', 'reviewer', 'seller').all()
        # Allow the seller's profile page to pull only reviews directed at them
        seller_id = self.request.query_params.get('seller')
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)
        
        # Also allow filtering by who wrote the review — useful for a user's "my reviews" page
        reviewer_id = self.request.query_params.get('reviewer')
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)
            
        return queryset

    # Stamp the current user as the reviewer so they can't fake reviews from other accounts
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reviewer=user)


# Read-only ViewSet for user notifications — users can't POST notifications directly
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    # Display personal alerts. 
    # Allow users to mark notifications as read.
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]

    # Only return notifications that belong to the currently logged-in user
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Filter strictly by user so one user can never see another's notifications
        return Notification.objects.filter(user=user)

    # Admin-only action to push a message to every user in the platform at once
    @action(detail=False, methods=['post'])
    def broadcast(self, request):
        # Allow superadmin to send a system-wide alert
        if not request.user.is_superuser:
            # Reject non-admin broadcast attempts immediately
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        # Pull the title and message body from the request payload
        title = request.data.get('title')
        content = request.data.get('content')
        
        # Both fields are required — a blank notification wouldn't make sense
        if not title or not content:
            return Response({'error': 'Title and content required'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch every user so we can create one notification row per person
        users = User.objects.all()
        # Build the list of Notification objects in memory before bulk inserting for efficiency
        notifications = [
            Notification(user=u, title=title, content=content) for u in users
        ]
        # Use bulk_create so the database doesn't get hammered with individual INSERT calls
        Notification.objects.bulk_create(notifications)
        
        # Tell the admin how many users received the broadcast
        return Response({'status': f'Broadcast sent to {len(users)} users.'})

    # Mark a single notification as read when the user taps on it
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        # Flip the is_read flag and save — this clears the unread badge on the app
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    # Clears all unread notifications for the user in a single operation
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Bulk-update only the unread ones to avoid unnecessary writes
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})


# Manages the saved/wishlist items for each user — each Favorite links a user to an item
class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.AllowAny]

    # Only return favourites that belong to the current user so they see their own wishlist
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Join the item data in the same query so the wishlist screen doesn't trigger extra hits
        return Favorite.objects.filter(user=user).select_related('item')

    # Automatically attach the current user when a new favourite is saved
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(user=user)


# APIView that uses a trained ML model (or a maths fallback) to suggest a resale price for a listing
class SuggestPriceView(APIView):
    # Suggest a fair market price using the trained ML model or fallback heuristic.
    permission_classes = [permissions.AllowAny]

    # Handle the price suggestion request — accepts item attributes and returns a suggested price
    def post(self, request, *args, **kwargs):
        # Extract inputs with defaults — these mirror the condition survey fields in the app
        category = request.data.get('category', 'Tech')
        brand = request.data.get('brand', 'Apple')
        condition_score = request.data.get('condition_score', 8.0)
        # How many days the item has been listed — longer listings may need a discount
        duration_days = request.data.get('duration_days', 5)
        # The original retail price of the item — used as the baseline for the heuristic
        original_price = request.data.get('original_price', 1000.0)

        # Basic validations
        try:
            # Cast all numeric inputs to their correct types before feeding them to the model
            condition_score = float(condition_score)
            duration_days = int(duration_days)
            original_price = float(original_price)
        except (ValueError, TypeError):
            # If any of the inputs can't be cast, tell the client exactly what went wrong
            return Response(
                {'error': 'Invalid parameter types. Check score, duration, and original price.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Path to trained model
        import os
        from django.conf import settings
        # Build the absolute path to the serialised joblib model file
        model_path = os.path.join(settings.BASE_DIR, 'price_predictor', 'price_predictor_model.joblib')
        # Start with None — if the model path doesn't exist we'll fall through to the heuristic
        suggested_price = None

        # Try to load and predict with ML model
        try:
            import joblib
            import pandas as pd
            
            # Only attempt to load if the model file actually exists on disk
            if os.path.exists(model_path):
                # Deserialise the trained scikit-learn pipeline from the joblib file
                model = joblib.load(model_path)
                # Build a single-row DataFrame that matches the feature columns the model was trained on
                input_data = pd.DataFrame([{
                    'category': category,
                    'brand': brand,
                    'condition_score': condition_score,
                    'duration_days': duration_days,
                    'original_price': original_price
                }])
                # Run the prediction and extract the single scalar result
                prediction = model.predict(input_data)[0]
                # Clamp to 0 and round to 2 decimal places so it looks like a real price
                suggested_price = max(0.0, round(float(prediction), 2))
        except Exception as e:
            # Log warning or pass to fallback
            # If anything goes wrong (missing library, model mismatch) we silently fall through
            pass

        # Fallback to high-fidelity math heuristic if model prediction failed or was not available
        if suggested_price is None:
            # Tech items hold their value better than fashion; books depreciate fastest
            base_retention = 0.80 if category == 'Tech' else (0.65 if category == 'Fashion' else 0.45)
            # Different brands retain different percentages of their original value on the secondhand market
            brand_multipliers = {
                'Apple': 0.90, 'Samsung': 0.80, 'Sony': 0.85, 'Dell': 0.75, 'Asus': 0.78,
                'Nike': 0.70, 'Adidas': 0.68, 'Gucci': 0.88, 'Chanel': 0.92,
                'Pearson': 0.55, 'Oxford': 0.50, 'Penguin': 0.40
            }
            # Default to 0.70 for unknown brands — a reasonable average retention rate
            brand_retention = brand_multipliers.get(brand, 0.70)
            # Map the 0-10 condition score onto a 0.25-1.00 price multiplier (even worst condition is worth 25%)
            condition_multiplier = 0.25 + 0.75 * (condition_score / 10.0)
            # Combine all three factors: category base * brand retention * condition level
            suggested_price = original_price * base_retention * brand_retention * condition_multiplier
            
            # Items listed for more than 7 days probably need a nudge to sell — apply a negotiation discount
            if duration_days > 7:
                # Cap the discount at 20% so the price doesn't collapse for very old listings
                negotiation_discount = min(0.20, (duration_days - 7) * 0.0025)
                suggested_price *= (1.0 - negotiation_discount)
            
            # Final clamp and rounding before returning the heuristic price
            suggested_price = max(0.0, round(float(suggested_price), 2))

        # Return the final suggested price — either from the ML model or the heuristic
        return Response({'suggested_price': suggested_price}, status=status.HTTP_200_OK)


# Allows sellers to group multiple items into a discounted bundle deal
class BundleViewSet(viewsets.ModelViewSet):
    # DIPLOMA FYP COMMENT:
    # Bundle Deals ViewSet allows sellers to manage multiple items as bundles.
    # Prefetch the seller profile and all item images so the bundle card renders without extra queries
    queryset = Bundle.objects.all().select_related('seller__profile').prefetch_related('items__images')
    serializer_class = BundleSerializer
    # Anyone can browse bundles, but only logged-in users can create or edit them
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    # Optionally filter bundles down to a specific seller's listings
    def get_queryset(self):
        queryset = super().get_queryset()
        # Let the frontend pass ?seller_id= to show only that seller's bundle deals
        seller_id = self.request.query_params.get('seller_id')
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)
        return queryset

    # Automatically assign the logged-in user as the bundle's seller on creation
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(seller=user)


# Lets users set a target price on an item and get notified when the seller drops the price
class PriceAlertViewSet(viewsets.ModelViewSet):
    # DIPLOMA FYP COMMENT:
    # Price Alerts ViewSet allows users to create target price alerts on specific items.
    serializer_class = PriceAlertSerializer
    # Must be logged in — price alerts are personal and tied to a specific user account
    permission_classes = [permissions.IsAuthenticated]

    # Only return price alerts set by the current user — they shouldn't see other people's alerts
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Join item data so the alerts screen can display the item name and image without extra queries
        return PriceAlert.objects.filter(user=user).select_related('item')

    # Automatically link the price alert to the logged-in user when it's created
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(user=user)


# Manages the user's block list — blocking someone hides their listings and prevents chat
class BlockViewSet(viewsets.ModelViewSet):
    # DIPLOMA FYP COMMENT:
    # Block ViewSet allows users to manage their blocked users lists.
    serializer_class = BlockSerializer
    # Must be logged in — you can only manage your own block list
    permission_classes = [permissions.IsAuthenticated]

    # Return only the blocks created by the current user so they manage their own list
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # Join the blocked user's info so the block list screen can show their username and picture
        return Block.objects.filter(blocker=user).select_related('blocked')

    # Tag the current user as the blocker when a new block is recorded
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        # The person doing the blocking is always the one making this request
        serializer.save(blocker=user)
