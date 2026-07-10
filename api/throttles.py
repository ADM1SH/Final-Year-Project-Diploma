"""
Custom throttle classes for the API.
Implements OWASP-aligned rate limiting per endpoint type and user role.
Rate values are configured in settings.py under DEFAULT_THROTTLE_RATES.
"""
# --- third-party ---
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class AnonBurstThrottle(AnonRateThrottle):
    """Short-window burst limit for unauthenticated requests — blocks scraping spikes."""
    scope = 'anon_burst'


class AnonSustainedThrottle(AnonRateThrottle):
    """Longer-window sustained limit for unauthenticated requests."""
    scope = 'anon_sustained'


class UserBurstThrottle(UserRateThrottle):
    """Short-window burst limit keyed to the authenticated user's ID."""
    scope = 'user_burst'


class UserSustainedThrottle(UserRateThrottle):
    """Longer-window sustained limit keyed to the authenticated user's ID."""
    scope = 'user_sustained'


class LoginThrottle(SimpleRateThrottle):
    """Strict IP-based throttle for the login endpoint — mitigates brute-force attacks."""
    scope = 'login'

    def get_cache_key(self, request, view):
        # Key by IP address regardless of auth state.
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class RegisterThrottle(SimpleRateThrottle):
    """Strict IP-based throttle for the registration endpoint — prevents bulk account creation."""
    scope = 'register'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}
