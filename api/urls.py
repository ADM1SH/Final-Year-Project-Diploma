from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProfileViewSet, ItemViewSet,
    TransactionViewSet, MessageViewSet, ScamReportViewSet,
    NotificationViewSet, ReviewViewSet, 
    RegisterView, LoginView, ChangePasswordView
)

# DefaultRouter auto-generates RESTful URL routing.
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'scam-reports', ScamReportViewSet, basename='scam-report')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
