# views.py
# API Viewsets and Logic for MyPreLove.
# This file handles requests for authentication, items, and social features.

from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Prefetch, Q, Avg, Sum
from rest_framework.decorators import action
from django.contrib.auth.models import User

# Local imports
from .models import Category, Profile, Item, Transaction, Message, ScamReport, Notification, Review, Favorite
from .serializers import (
    CategorySerializer, ProfileSerializer, ItemSerializer,
    TransactionSerializer, MessageSerializer, ScamReportSerializer,
    NotificationSerializer, ChangePasswordSerializer,
    ReviewSerializer, RegisterSerializer, UserSerializer, FavoriteSerializer
)

class RegisterView(APIView):
    # Create new user accounts.
    # Provide authentication tokens immediately.
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    # Update user passwords. 
    # Check old password before applying changes.
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if user.is_anonymous:
                user = User.objects.first() 
            
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(ObtainAuthToken):
    # Authenticate users. 
    # Return the secret token for mobile sessions.
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class UserViewSet(viewsets.ModelViewSet):
    # Standard user operations.
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CategoryViewSet(viewsets.ModelViewSet):
    # List available item categories.
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProfileViewSet(viewsets.ModelViewSet):
    # Display user profiles. 
    # Link to trust scores and verification.
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    search_fields = ['user__username']
    ordering_fields = ['trust_score']

    @action(detail=False, methods=['get'])
    def me(self, request):
        # Return the profile of the currently logged-in user
        user = request.user
        if user.is_anonymous:
            # Fallback for dev/demo if not logged in
            user = User.objects.first()
        
        profile, created = Profile.objects.get_or_create(user=user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def marketplace_stats(self, request):
        # Return real platform-wide stats for the Admin Dashboard
        return Response({
            'total_users': User.objects.count(),
            'active_items': Item.objects.filter(is_sold=False).count(),
            'total_sales': Transaction.objects.filter(status='COMPLETED').count(),
            'reports_pending': ScamReport.objects.filter(status='PENDING').count(),
        })

    @action(detail=True, methods=['get'])
    def user_stats(self, request, pk=None):
        # Return real user-specific stats for the Profile Screen
        profile = self.get_object()
        user = profile.user
        return self._get_user_stats_response(user, profile)

    @action(detail=False, methods=['get'], url_path='me/user_stats')
    def me_stats(self, request):
        # Convenience endpoint for current user's stats
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        profile, created = Profile.objects.get_or_create(user=user)
        return self._get_user_stats_response(user, profile)

    def _get_user_stats_response(self, user, profile):
        return Response({
            'live_listings': user.items.filter(is_sold=False).count(),
            'items_sold': user.sales.filter(status='COMPLETED').count(),
            'avg_rating': user.reviews_received.aggregate(Avg('rating'))['rating__avg'] or 0.0,
            'trust_score': profile.trust_score,
            'carbon_saved': user.items.aggregate(Sum('eco_impact'))['eco_impact__sum'] or 0.0
        })


class ItemViewSet(viewsets.ModelViewSet):
    # Manage marketplace items. 
    # Support search and filtering by price or grade.
    queryset = Item.objects.select_related('seller', 'category').prefetch_related('images').all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    
    filterset_fields = ['category', 'calculated_grade', 'is_sold', 'price']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        # If no specific 'is_sold' filter is provided, default to only showing unsold items
        # This keeps the main feed clean while still allowing history lookups
        is_sold_filter = self.request.query_params.get('is_sold')
        if is_sold_filter is None:
            queryset = queryset.filter(is_sold=False)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"❌ VALIDATION ERROR: {serializer.errors}")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first() 
        serializer.save(seller=user)

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        item = self.get_object()
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        favorite, created = Favorite.objects.get_or_create(user=user, item=item)
        if not created:
            favorite.delete()
            return Response({'status': 'removed from favorites'})
        return Response({'status': 'added to favorites'})


class TransactionViewSet(viewsets.ModelViewSet):
    # Record sales. 
    # Link buyers and sellers via item listings.
    serializer_class = TransactionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        return Transaction.objects.filter(Q(buyer=user) | Q(seller=user)).select_related('item', 'buyer', 'seller')

    def perform_create(self, serializer):
        item = serializer.validated_data['item']
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        # Prevent self-buying
        if user == item.seller:
            raise serializers.ValidationError("You cannot buy your own item.")
            
        offer_price = serializer.validated_data.get('offer_price')
        final_price = offer_price if offer_price is not None else item.price

        serializer.save(
            buyer=user,
            seller=item.seller,
            final_price=final_price
        )


class MessageViewSet(viewsets.ModelViewSet):
    # Facilitate in app chat. 
    # Filter messages by sender and receiver identity.
    serializer_class = MessageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        queryset = Message.objects.filter(Q(sender=user) | Q(receiver=user)).select_related('sender', 'receiver', 'item')
        
        # Support filtering by a specific partner for the ChatDetail screen
        partner_name = self.request.query_params.get('partner')
        if partner_name:
            queryset = queryset.filter(
                Q(sender__username=partner_name) | Q(receiver__username=partner_name)
            )
        return queryset

    @action(detail=False, methods=['post'])
    def mark_conversation_read(self, request):
        user = request.user
        if user.is_anonymous:
            user = User.objects.first()
        
        partner_name = request.data.get('partner')
        if not partner_name:
            return Response({'error': 'Partner name required'}, status=status.HTTP_400_BAD_REQUEST)
        
        Message.objects.filter(
            receiver=user,
            sender__username=partner_name,
            is_read=False
        ).update(is_read=True)
        
        return Response({'status': 'messages marked as read'})

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(sender=user)


class ScamReportViewSet(viewsets.ModelViewSet):
    # Allow users to flag fraud.
    serializer_class = ScamReportSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        return ScamReport.objects.filter(reporter=user).select_related('reporter', 'reported_user', 'item')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reporter=user)


class ReviewViewSet(viewsets.ModelViewSet):
    # Manage buyer feedback.
    queryset = Review.objects.select_related('item', 'reviewer', 'seller').all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reviewer=user)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    # Display personal alerts. 
    # Allow users to mark notifications as read.
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        return Notification.objects.filter(user=user)

    @action(detail=False, methods=['post'])
    def broadcast(self, request):
        # Allow superadmin to send a system-wide alert
        if not request.user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        title = request.data.get('title')
        content = request.data.get('content')
        
        if not title or not content:
            return Response({'error': 'Title and content required'}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.all()
        notifications = [
            Notification(user=u, title=title, content=content) for u in users
        ]
        Notification.objects.bulk_create(notifications)
        
        return Response({'status': f'Broadcast sent to {len(users)} users.'})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        return Favorite.objects.filter(user=user).select_related('item')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(user=user)
