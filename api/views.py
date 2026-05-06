from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Prefetch
from .models import Category, Profile, Item, Review
from .serializers import (
    CategorySerializer, ProfileSerializer, ItemSerializer, 
    ReviewSerializer, RegisterSerializer, UserSerializer
)

class RegisterView(APIView):
    """Handles new user registration and returns an auth token."""
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


class LoginView(ObtainAuthToken):
    """Authenticates user and returns token plus basic user info."""
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
    """CRUD operations for categories."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProfileViewSet(viewsets.ModelViewSet):
    """CRUD operations for user profiles. Optimized queries using select_related."""
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.AllowAny]


class ItemViewSet(viewsets.ModelViewSet):
    """CRUD operations for items. Uses select_related to avoid N+1 queries for seller/category."""
    # select_related fetches related ForeignKey data in a single SQL query
    queryset = Item.objects.select_related('seller', 'category').all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Auto-assign the currently authenticated user as the seller
        # Fallback to the first user if anonymous (for initial development ease)
        from django.contrib.auth.models import User
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first() # Temporary dev hack since Auth isn't enforced yet
        serializer.save(seller=user)


class ReviewViewSet(viewsets.ModelViewSet):
    """CRUD operations for reviews."""
    queryset = Review.objects.select_related('item', 'reviewer', 'seller').all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Auto-assign the currently authenticated user as the reviewer
        from django.contrib.auth.models import User
        user = self.request.user
        if user.is_anonymous:
            user = User.objects.first()
        serializer.save(reviewer=user)
