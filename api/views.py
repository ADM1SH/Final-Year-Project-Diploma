from rest_framework import viewsets, permissions
from django.contrib.auth.models import User
from .models import Category, Profile, Item, Review
from .serializers import CategorySerializer, ItemSerializer, ReviewSerializer, ProfileSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny] # Change to IsAuthenticated later if needed

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    
    def perform_create(self, serializer):
        # Automatically set the seller to the current user
        # During dev with AllowAny, you might want to handle this differently
        serializer.save(seller=self.request.user)

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
