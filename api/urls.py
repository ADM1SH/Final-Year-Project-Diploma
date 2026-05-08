from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import all our views
from .views import (
    CategoryViewSet, ProfileViewSet, ItemViewSet,
    TransactionViewSet, MessageViewSet, ScamReportViewSet,
    NotificationViewSet, ReviewViewSet, 
    RegisterView, LoginView, ChangePasswordView
)

"""
EXPLANATION: Routing tells the server WHICH URL goes to WHICH view.
The 'DefaultRouter' automatically generates all standard URLs 
(GET, POST, PUT, DELETE) for our ViewSets.
"""

router = DefaultRouter()

# These lines create the standard endpoints like /api/items/ or /api/profiles/
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'scam-reports', ScamReportViewSet, basename='scam-report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    # Include the auto-generated URLs from the router above
    path('', include(router.urls)),
    
    # Custom endpoints that don't fit the standard 'ViewSet' pattern
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
