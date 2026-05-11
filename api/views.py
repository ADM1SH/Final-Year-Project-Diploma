# views.py
# API Viewsets and Logic for MyPreLove.
# This file handles requests for authentication, items, and social features.

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Prefetch, Q
from rest_framework.decorators import action
from django.contrib.auth.models import User

# Local imports
from .models import Category, Profile, Item, Transaction, Message, ScamReport, Notification, Review
from .serializers import (
    CategorySerializer, ProfileSerializer, ItemSerializer,
    TransactionSerializer, MessageSerializer, ScamReportSerializer,
    NotificationSerializer, ChangePasswordSerializer,
    ReviewSerializer, RegisterSerializer, UserSerializer
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


class ItemViewSet(viewsets.ModelViewSet):
    # Manage marketplace items. 
    # Support search and filtering by price or grade.
    queryset = Item.objects.select_related('seller', 'category').prefetch_related('images').all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.AllowAny]
    
    filterset_fields = ['category', 'calculated_grade', 'is_sold', 'price']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first() 
        serializer.save(seller=user)


class TransactionViewSet(viewsets.ModelViewSet):
    # Record sales. 
    # Link buyers and sellers via item listings.
    queryset = Transaction.objects.select_related('item', 'buyer', 'seller').all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        item = serializer.validated_data['item']
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
            
        serializer.save(
            buyer=user,
            seller=item.seller,
            final_price=item.price
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
        return Message.objects.filter(Q(sender=user) | Q(receiver=user)).select_related('sender', 'receiver', 'item')

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

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})
