"""
Custom exception handler for the Django REST Framework API.

Responsibilities:
  1. Returns a safe, generic error message for unhandled 500 errors (prevents information disclosure).
  2. Ensures all error responses are consistently structured JSON.
  3. Logs the full exception with stack trace server-side for debugging.
"""
# --- stdlib ---
import logging

# --- third-party ---
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('django.request')


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception_handler to catch unhandled exceptions (response is None)
    and return a sanitised 500 JSON response instead of leaking tracebacks.
    """
    # Call REST framework's default exception handler first.
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — log full traceback server-side, return sanitised 500.
        view_name = context['view'].__class__.__name__ if 'view' in context else 'unknown'
        request_path = context['request'].path if 'request' in context else 'unknown'

        logger.error(
            "Unhandled exception in API view '%s' at '%s': %s",
            view_name,
            request_path,
            exc,
            exc_info=True,
        )

        return Response(
            {"error": "An internal server error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # DRF-handled error (e.g. 400 Validation, 403 Permission) — pass through as-is.
    return response
