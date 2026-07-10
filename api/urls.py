"""
Configures the URL routing patterns for the API application,
mapping REST endpoints to their respective ViewSets and API views.
"""
from django.conf import settings
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView


from .views import (
    CategoryViewSet, ProfileViewSet, ItemViewSet,
    TransactionViewSet, MessageViewSet, ScamReportViewSet,
    NotificationViewSet, ReviewViewSet, FavoriteViewSet,
    UserViewSet, RegisterView, LoginView, LogoutView, ChangePasswordView,
    PasswordResetDirectView, PasswordResetRequestView, PasswordResetVerifyView, SuggestPriceView,
    BundleViewSet, PriceAlertViewSet, BlockViewSet
)


router = DefaultRouter()


# Register REST ViewSets with the default router to generate path endpoints automatically
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

# Configure explicit endpoint mappings for custom API actions and authentication views
urlpatterns = [

    path('items/suggest_price/', SuggestPriceView.as_view(), name='suggest-price'),


    path('', include(router.urls)),


    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password-reset-verify'),
]

# Demo-only, username-only password reset bypass — insecure by design (see the
# view's docstring). Registered ONLY when DEBUG=True, so in any non-debug
# deployment the route doesn't exist in the URLconf at all: a request to
# /password-reset/direct/ 404s exactly as if the path were never defined,
# rather than reaching the view and relying on the view to reject it.
if settings.DEBUG:
    urlpatterns.append(
        path('password-reset/direct/', PasswordResetDirectView.as_view(), name='password-reset-direct'),
    )
