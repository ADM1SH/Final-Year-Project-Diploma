from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Prefetch
from rest_framework.decorators import action

# Local imports
from .models import Category, Profile, Item, Transaction, Message, ScamReport, Notification, Review
from .serializers import (
    CategorySerializer, ProfileSerializer, ItemSerializer,
    TransactionSerializer, MessageSerializer, ScamReportSerializer,
    NotificationSerializer, ChangePasswordSerializer,
    ReviewSerializer, RegisterSerializer, UserSerializer
)

"""
EXPLANATION: ViewSets handle the logic of your API.
They decide WHICH data to show and WHO is allowed to see it.
"""

class RegisterView(APIView):
    """
    Handles new user sign-ups. 
    It creates a user and immediately gives them a Token so they stay logged in.
    """
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
    """
    Allows a logged-in user to securely update their password.
    """
    permission_classes = [permissions.AllowAny] # In production, use permissions.IsAuthenticated

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            # Development fallback for unauthenticated testing
            if user.is_anonymous:
                from django.contrib.auth.models import User
                user = User.objects.first() 
            
            # Verify the old password before setting the new one
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(ObtainAuthToken):
    """
    Authenticates a user and returns their secret Token.
    The Android app saves this token to keep the session alive.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Displays personal alerts for the logged-in user.
    Includes a custom action to 'mark as read'.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
        # Users can only see notifications addressed to THEM
        return Notification.objects.filter(user=user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        # A custom button in your app can trigger this to hide the notification
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})


class CategoryViewSet(viewsets.ModelViewSet):
    """List of all available item categories."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProfileViewSet(viewsets.ModelViewSet):
    """
    Displays user profiles. 
    Optimized with 'select_related' to fetch User data in one single SQL query.
    """
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.AllowAny]


class ItemViewSet(viewsets.ModelViewSet):
    """
    The main marketplace endpoint. 
    - select_related: Fetches Seller & Category in one go (N+1 fix).
    - prefetch_related: Fetches all gallery images in one go.
    """
    queryset = Item.objects.select_related('seller', 'category').prefetch_related('images').all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.AllowAny]
    
    # These fields enable the 'Search' and 'Filter' bars in your app
    filterset_fields = ['category', 'calculated_grade', 'is_sold', 'price']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def perform_create(self, serializer):
        # Automatically links the new item to the user who posted it
        from django.contrib.auth.models import User
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first() 
        serializer.save(seller=user)


class TransactionViewSet(viewsets.ModelViewSet):
    """
    Handles the deal-making process. 
    Automatically sets the buyer/seller and price based on the item.
    """
    queryset = Transaction.objects.select_related('item', 'buyer', 'seller').all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        item = serializer.validated_data['item']
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
            
        # The person who clicks 'Buy' becomes the buyer
        # The owner of the item becomes the seller
        serializer.save(
            buyer=user,
            seller=item.seller,
            final_price=item.price
        )


class MessageViewSet(viewsets.ModelViewSet):
    """
    Handles in-app chats.
    Includes a filter so you ONLY see chats you are part of.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
        
        # Privacy logic: Only show messages where user is either sender or receiver
        from django.db.models import Q
        return Message.objects.filter(Q(sender=user) | Q(receiver=user)).select_related('sender', 'receiver', 'item')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
        serializer.save(sender=user)


class ScamReportViewSet(viewsets.ModelViewSet):
    """Allows users to lodge reports against fraudulent listings."""
    serializer_class = ScamReportSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
        
        # Regular users only see reports they have filed themselves
        return ScamReport.objects.filter(reporter=user).select_related('reporter', 'reported_user', 'item')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            from django.contrib.auth.models import User
            user = User.objects.first()
        serializer.save(reporter=user)


class ReviewViewSet(viewsets.ModelViewSet):
    """Handles textual reviews and star ratings."""
    queryset = Review.objects.select_related('item', 'reviewer', 'seller').all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        from django.contrib.auth.models import User
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reviewer=user)
