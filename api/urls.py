# urls.py
# API route mapping for MyPreLove.
# This file links URL paths to view logic.

from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import all views
from .views import (
    CategoryViewSet, ProfileViewSet, ItemViewSet,
    TransactionViewSet, MessageViewSet, ScamReportViewSet,
    NotificationViewSet, ReviewViewSet, FavoriteViewSet,
    UserViewSet, RegisterView, LoginView, ChangePasswordView, SuggestPriceView,
    BundleViewSet, PriceAlertViewSet, BlockViewSet
)

# Configure the router for automated URL generation.
router = DefaultRouter()

# Register endpoints.
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'users', UserViewSet, basename='user')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'scam-reports', ScamReportViewSet, basename='scam-report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'price-alerts', PriceAlertViewSet, basename='price-alert')
router.register(r'blocks', BlockViewSet, basename='block')

urlpatterns = [
    # Custom endpoints (must be defined before router to prevent URL clashing)
    path('items/suggest_price/', SuggestPriceView.as_view(), name='suggest-price'),

    # Router generated paths.
    path('', include(router.urls)),
    
    # Custom authentication endpoints.
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
