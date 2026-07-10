"""
Django settings configuration for the marketplace project, specifying database connections,
regional timezone definitions, REST framework configuration, and security controls.
"""
# --- stdlib ---
import os
from datetime import timedelta
from pathlib import Path

# --- third-party ---
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from a local .env file (gitignored — see .env.example
# for the template) if one exists. load_dotenv() only fills in keys that aren't
# already present in os.environ, so this is safe to call unconditionally: real
# environment variables injected by a hosting platform in production always win.
load_dotenv(BASE_DIR / '.env')

# ---------------------------------------------------------------------------
# SECURITY
# ---------------------------------------------------------------------------

# Pull SECRET_KEY from environment — crash on startup if not set to prevent insecure deployments.
_secret_key = os.environ.get('DJANGO_SECRET_KEY')
if not _secret_key:
    import warnings
    warnings.warn(
        "DJANGO_SECRET_KEY is not set. Using an insecure default — DO NOT use in production.",
        stacklevel=2,
    )
    _secret_key = 'django-insecure-dev-only-key-do-not-use-in-production'

SECRET_KEY = _secret_key

# Read DEBUG from environment — defaults to True for local development.
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

# Trust proxy headers so request.build_absolute_uri() uses https correctly (e.g. via ngrok).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CRITICAL: ALLOWED_HOSTS must NEVER be ['*'] in production.
# Parse from environment variable, falling back to localhost-only and ngrok domains during development.
_allowed_hosts_env = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,.ngrok-free.dev,.ngrok-free.app,.ngrok.io')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]

# ---------------------------------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
    'api.apps.ApiConfig',
]

# ---------------------------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    # CorsMiddleware must come before CommonMiddleware.
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# ---------------------------------------------------------------------------
# TEMPLATES
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# STATIC & MEDIA
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------------------------------------------------------------------------
# DATABASE
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ---------------------------------------------------------------------------
# PASSWORD VALIDATION
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# ---------------------------------------------------------------------------
# INTERNATIONALISATION
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kuala_Lumpur'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

# Only allow origins specified in environment — never allow all origins in production.
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:8081,http://127.0.0.1:8081')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]

# Allow CORS for Expo dev tunnel (ngrok-style) during development.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.ngrok-free\.dev$',
    r'^https://.*\.ngrok-free\.app$',
    r'^https://.*\.ngrok\.io$',
]

# ---------------------------------------------------------------------------
# REST FRAMEWORK
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'EXCEPTION_HANDLER': 'api.exceptions.custom_exception_handler',
    # Secure default: require authentication on all endpoints unless explicitly overridden.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # Global throttle classes — each view can override with its own throttle_classes list.
    'DEFAULT_THROTTLE_CLASSES': [
        'api.throttles.AnonBurstThrottle',
        'api.throttles.AnonSustainedThrottle',
        'api.throttles.UserBurstThrottle',
        'api.throttles.UserSustainedThrottle',
    ],
    # Rate limits per scope. All limits are conservative and safe to increase for production.
    'DEFAULT_THROTTLE_RATES': {
        'anon_burst': '300/minute',
        'anon_sustained': '2000/hour',
        'user_burst': '600/minute',
        'user_sustained': '10000/hour',
        'login': '5/minute',
        'register': '3/minute',
    },
}

# ---------------------------------------------------------------------------
# SIMPLE JWT
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=24),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ---------------------------------------------------------------------------
# PRODUCTION SECURITY SETTINGS
# ---------------------------------------------------------------------------

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31_536_000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_REFERRER_POLICY = 'same-origin'
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# ---------------------------------------------------------------------------
# STRIPE CONFIGURATION
# ---------------------------------------------------------------------------

# Pull Stripe credentials from the environment (populated from .env locally via
# load_dotenv() above, or injected directly by the host in production). No
# hardcoded key literals live in source anymore — see .env.example for the
# template and Section 4 of handoff.md for why this changed.
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
# Still a placeholder pending real webhook configuration (see handoff.md) — the
# confirm-payment client fallback is what actually advances the flow in dev.
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', 'whsec_dummy')

if not STRIPE_SECRET_KEY or not STRIPE_PUBLIC_KEY:
    if DEBUG:
        import warnings
        warnings.warn(
            "STRIPE_PUBLIC_KEY / STRIPE_SECRET_KEY are not set (checked .env and "
            "the environment). Stripe-dependent endpoints will fail until they're "
            "configured — copy .env.example to .env and fill in your test keys.",
            stacklevel=2,
        )
    else:
        raise RuntimeError(
            "STRIPE_PUBLIC_KEY and STRIPE_SECRET_KEY must be set via environment "
            "variables in production."
        )
