"""
Handles user account management views including registration, logins, password changes,
verification workflows, wallet transactions, leaderboard rankings, and profile stats.
"""
# --- stdlib ---
import logging

# --- django ---
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.core import signing
from django.db.models import Avg, Sum

# --- third-party ---
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

# --- local ---
from ..models import Item, Notification, Profile, ScamReport, Transaction
from ..recovery_words import generate_recovery_words, generate_reset_positions
from ..serializers import (
    ChangePasswordSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)
from ..throttles import LoginThrottle, RegisterThrottle, UserBurstThrottle, UserSustainedThrottle

RECOVERY_RESET_SALT = "api.password-reset-recovery-words"
RECOVERY_RESET_MAX_AGE = 60 * 15  # 15 minutes to complete a reset

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Auth Views
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    """Public endpoint — allows new user sign-ups. Strict throttle prevents bulk account creation."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            # Generate 9 recovery words, store only their hashes, return the
            # plaintext words once so the user can write them down.
            recovery_words = generate_recovery_words(9)
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.recovery_keywords = [make_password(word) for word in recovery_words]
            profile.save(update_fields=['recovery_keywords'])

            return Response({
                'token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': UserSerializer(user).data,
                'recovery_words': recovery_words,
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """Public endpoint — strict brute-force throttle limits attempts to 5 per minute per IP."""
    throttle_classes = [LoginThrottle]
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # AuthTokenSerializer validates username/password against the database.
        from rest_framework.authtoken.serializers import AuthTokenSerializer
        serializer = AuthTokenSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    """Blacklists the provided refresh token to invalidate the session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"status": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Requires authentication — only allows a user to change their own password."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserBurstThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)


class PasswordResetDirectView(APIView):
    """
    Directly resets a password using just the username (Insecure for production,
    requested for FYP Demo). Gated behind settings.DEBUG in two layers:
    api/urls.py only registers this route at all when DEBUG=True, and this
    view independently refuses to run outside DEBUG too — so even if a future
    change re-registers the route unconditionally, the endpoint itself stays
    dead in any non-debug deployment instead of silently becoming reachable.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def post(self, request):
        if not settings.DEBUG:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        username = request.data.get('username', '').strip()
        new_password = request.data.get('new_password', '')

        if not username or not new_password:
            return Response({"error": "Username and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username__iexact=username).first()
        if user:
            user.set_password(new_password)
            user.save()
            return Response({"status": "Password reset successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class PasswordResetRequestView(APIView):
    """
    Step 1 of the recovery-word reset flow. Given a username, picks 3 random
    positions (1-9) out of the user's 9 recovery words and returns them along
    with a short-lived signed token embedding the user id + those positions.
    No email is sent — the same generic response is returned whether or not
    the user/word-set exists, to avoid leaking account existence.
    """
    permission_classes = [permissions.AllowAny]
    # Uses LoginThrottle (not RegisterThrottle) — this endpoint is unrelated to account
    # creation and must not share Register's rate-limit bucket, otherwise a user who just
    # registered can get spuriously throttled here on the very next request from the
    # same IP, since both would otherwise consume the same 3/minute 'register' bucket.
    throttle_classes = [LoginThrottle]

    def post(self, request):
        username = request.data.get('username', '').strip()
        user = User.objects.filter(username__iexact=username).first()
        profile = getattr(user, 'profile', None) if user else None

        if not user or not profile or not profile.recovery_keywords or len(profile.recovery_keywords) < 9:
            return Response(
                {"error": "No recovery words are set up for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        positions = generate_reset_positions(total=len(profile.recovery_keywords), needed=3)
        token = signing.dumps({'user_id': user.id, 'positions': positions}, salt=RECOVERY_RESET_SALT)

        return Response({'token': token, 'positions': positions}, status=status.HTTP_200_OK)


class PasswordResetVerifyView(APIView):
    """
    Step 2 of the recovery-word reset flow. Verifies the 3 words supplied for
    the positions embedded in the token, and if correct, sets the new password.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        token = request.data.get('token', '')
        words = request.data.get('words', {})
        new_password = request.data.get('new_password', '')

        if not token or not words or not new_password:
            return Response({"error": "Token, words, and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = signing.loads(token, salt=RECOVERY_RESET_SALT, max_age=RECOVERY_RESET_MAX_AGE)
        except signing.SignatureExpired:
            return Response({"error": "This reset request has expired. Please start over."}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({"error": "Invalid reset request."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(id=payload.get('user_id')).first()
        profile = getattr(user, 'profile', None) if user else None
        if not user or not profile or not profile.recovery_keywords:
            return Response({"error": "Invalid reset request."}, status=status.HTTP_400_BAD_REQUEST)

        positions = payload.get('positions', [])
        hashes = profile.recovery_keywords
        for position in positions:
            supplied_word = str(words.get(str(position), '')).strip().lower()
            index = position - 1
            if index < 0 or index >= len(hashes) or not supplied_word:
                return Response({"error": "Incorrect recovery words."}, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(supplied_word, hashes[index]):
                return Response({"error": "Incorrect recovery words."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"status": "Password reset successfully"}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# User ViewSet
# ---------------------------------------------------------------------------

class UserViewSet(mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only browsing (list/retrieve) restricted to admin (is_staff) users to
    prevent user enumeration. Account deletion is additionally restricted to
    superadmins only, since it is a destructive, cascading operation (removes
    the user's items, transactions, messages, etc. via on_delete=CASCADE).
    """
    queryset = User.objects.all().only('id', 'username', 'email', 'is_active')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def perform_destroy(self, instance):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only superadmins can delete user accounts.")
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("You cannot delete your own account.")
        instance.delete()


# ---------------------------------------------------------------------------
# Profile ViewSet
# ---------------------------------------------------------------------------

class ProfileViewSet(viewsets.ModelViewSet):
    """Viewset to view and update user profiles, manage verification, and query leaderboards."""

    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    pagination_class = None
    lookup_field = 'user_id'
    search_fields = ['user__username']
    ordering_fields = ['trust_score']

    def get_permissions(self):
        # Public read access for browsing profiles; writes require authentication.
        if self.action in ('list', 'retrieve', 'eco_leaderboard', 'marketplace_stats', 'user_stats'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        # Apply stricter throttle on write actions.
        if self.action in ('me', 'top_up', 'request_verification'):
            return [UserBurstThrottle(), UserSustainedThrottle()]
        return super().get_throttles()

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Use /me/ endpoint for profile updates.")

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Use /me/ endpoint for profile updates.")

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method, detail="Cannot delete profiles via API.")

    # ------------------------------------------------------------------
    # /me/ actions
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Retrieve or update the profile of the currently authenticated user."""
        profile, _ = Profile.objects.select_related('user').get_or_create(user=request.user)

        if request.method in ('PUT', 'PATCH'):
            partial = request.method == 'PATCH'
            serializer = self.get_serializer(profile, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(profile)
        return Response(serializer.data)



    @action(detail=False, methods=['post'], url_path='me/request_verification')
    def request_verification(self, request):
        """Allows an authenticated user to submit a verification document."""
        profile, _ = Profile.objects.get_or_create(user=request.user)

        doc_file = request.FILES.get('verification_document')
        if doc_file:
            profile.verification_document = doc_file
            profile.save(update_fields=['verification_document'])
            
            # Notify the superadmin about the new verification request
            superadmin = User.objects.filter(is_superuser=True).first()
            notifications_to_create = [
                Notification(
                    user=request.user,
                    title="Verification Request Submitted",
                    content="Our admins are reviewing your profile. We will update you soon!",
                )
            ]
            if superadmin:
                notifications_to_create.append(
                    Notification(
                        user=superadmin,
                        title="Verification Request",
                        content=f"User {request.user.username} has requested profile verification.",
                        related_id=request.user.id,
                    )
                )
            Notification.objects.bulk_create(notifications_to_create)
            return Response({'success': True, 'message': 'Verification request submitted successfully'})
        else:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='me/stripe_onboard')
    def stripe_onboard(self, request):
        """Generates a Stripe Connect onboarding link for the seller."""
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        profile = Profile.objects.get(user=request.user)
        
        try:
            # 1. Create a Connected Account if they don't have one
            if not profile.stripe_account_id:
                account = stripe.Account.create(
                    type='standard',
                    country='MY',
                    email=request.user.email,
                )
                profile.stripe_account_id = account.id
                profile.save(update_fields=['stripe_account_id'])
            
            # 2. Generate Account Link for Onboarding
            account_link = stripe.AccountLink.create(
                account=profile.stripe_account_id,
                refresh_url='https://example.com/reauth',
                return_url='https://example.com/return',
                type='account_onboarding',
            )
            return Response({'url': account_link.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='me/stripe_balance')
    def stripe_balance(self, request):
        """Fetches the real-time balance of the user's Stripe Connected account."""
        profile = Profile.objects.get(user=request.user)
        if not profile.stripe_account_id:
            return Response({'available': 0.0, 'pending': 0.0})

        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            balance = stripe.Balance.retrieve(stripe_account=profile.stripe_account_id)
            available = sum(b.amount for b in balance.available) / 100.0
            pending = sum(b.amount for b in balance.pending) / 100.0
            return Response({'available': available, 'pending': pending})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Admin actions
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'], url_path='approve_verification')
    def approve_verification(self, request, user_id=None):
        """Admin-only — approves a user's identity verification and recalculates trust score."""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only admins can approve verification requests'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile = Profile.objects.select_related('user').get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        Profile.objects.filter(pk=profile.pk).update(is_verified=True)
        profile.is_verified = True
        profile.recalculate_trust_score()

        Notification.objects.create(
            user=profile.user,
            title="Profile Verified! ✅",
            content="Congratulations! Your profile has been verified. You've earned 20 ABI Integrity points!",
        )
        return Response({'success': True, 'message': 'Profile verified successfully'})

    @action(detail=True, methods=['post'], url_path='reject_verification')
    def reject_verification(self, request, user_id=None):
        """Admin-only — rejects a verification request and clears the uploaded document."""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only admins can reject verification requests'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile = Profile.objects.select_related('user').get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        Profile.objects.filter(pk=profile.pk).update(is_verified=False, verification_document='')
        profile.is_verified = False
        profile.recalculate_trust_score()

        Notification.objects.create(
            user=profile.user,
            title="Verification Rejected ❌",
            content="Your verification request was rejected. Please ensure you upload a valid ID and try again.",
        )
        return Response({'success': True, 'message': 'Profile verification rejected'})

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend_user(self, request, user_id=None):
        """Admin-only — suspends a user account, preventing login."""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only admins can suspend users.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile = Profile.objects.select_related('user').get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', 'Violation of platform policies.')
        profile.user.is_active = False
        profile.user.save(update_fields=['is_active'])

        Notification.objects.create(
            user=profile.user,
            title="Account Suspended ⛔",
            content=f"Your account has been suspended. Reason: {reason}. Please contact support if you believe this is an error.",
        )
        return Response({'success': True, 'message': f'User {profile.user.username} has been suspended.'})

    @action(detail=True, methods=['post'], url_path='unsuspend')
    def unsuspend_user(self, request, user_id=None):
        """Admin-only — restores a suspended user account."""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only admins can unsuspend users.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile = Profile.objects.select_related('user').get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        profile.user.is_active = True
        profile.user.save(update_fields=['is_active'])

        Notification.objects.create(
            user=profile.user,
            title="Account Reinstated ✅",
            content="Your account suspension has been lifted. Welcome back to MyPreLove!",
        )
        return Response({'success': True, 'message': f'User {profile.user.username} has been unsuspended.'})


    # ------------------------------------------------------------------
    # Public leaderboard / stats actions
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='eco_leaderboard')
    def eco_leaderboard(self, request):
        """Public endpoint — returns the top 10 profiles ranked by cumulative eco impact."""
        leaderboard = (
            Profile.objects.select_related('user')
            .annotate(total_eco_saved=Sum('user__items__eco_impact'))
            .filter(total_eco_saved__gt=0)
            .order_by('-total_eco_saved')[:10]
        )

        data = [
            {
                'user_id': p.user.id,
                'username': p.user.username,
                'trust_score': p.trust_score,
                'is_verified': p.is_verified,
                'profile_picture': (
                    request.build_absolute_uri(p.profile_picture.url)
                    if p.profile_picture else None
                ),
                'total_eco_saved': p.total_eco_saved,
            }
            for p in leaderboard
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def marketplace_stats(self, request):
        """Public endpoint — returns aggregate marketplace statistics."""
        return Response({
            'total_users': User.objects.count(),
            'active_items': Item.objects.filter(is_sold=False).count(),
            'total_sales': Transaction.objects.filter(status=Transaction.Status.COMPLETED).count(),
            'reports_pending': ScamReport.objects.filter(status=ScamReport.Status.PENDING).count(),
        })

    @action(detail=True, methods=['get'])
    def user_stats(self, request, user_id=None):
        """Public endpoint — returns public stats for a specific user profile."""
        profile = self.get_object()
        return self._get_user_stats_response(profile.user, profile)

    @action(detail=False, methods=['get'], url_path='me/user_stats')
    def me_stats(self, request):
        """Returns stats for the currently authenticated user."""
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return self._get_user_stats_response(request.user, profile)

    def _get_user_stats_response(self, user, profile):
        return Response({
            'live_listings': user.items.filter(is_sold=False).count(),
            'items_sold': user.sales.filter(status=Transaction.Status.COMPLETED).count(),
            'avg_rating': user.reviews_received.aggregate(Avg('rating'))['rating__avg'] or 0.0,
            'trust_score': profile.trust_score,
            'carbon_saved': user.items.aggregate(Sum('eco_impact'))['eco_impact__sum'] or 0.0,
        })
