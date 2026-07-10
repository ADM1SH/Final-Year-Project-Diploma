"""
Input validation helpers used across API views.
Implements a fail-closed approach — rejects unexpected fields and enforces strict type/range checks.
"""
# --- stdlib ---
from decimal import Decimal, InvalidOperation

# --- third-party ---
from rest_framework import serializers


# Fields explicitly allowed in the top-up payload — anything else is rejected.
_TOP_UP_ALLOWED_FIELDS = frozenset({'amount'})

# Fields explicitly allowed in the suggest-price payload.
_SUGGEST_PRICE_ALLOWED_FIELDS = frozenset({'category', 'brand', 'condition_score', 'duration_days', 'original_price'})

# Hard limits for monetary values.
_TOP_UP_MIN = Decimal('1.00')
_TOP_UP_MAX = Decimal('10000.00')


def reject_extra_fields(data, allowed_fields):
    """
    Fail-closed: raises ValidationError if the payload contains any unexpected fields.
    Accepts both dict-like objects and QueryDicts.
    """
    unexpected = set(data.keys()) - allowed_fields
    if unexpected:
        raise serializers.ValidationError(
            {'error': f"Unexpected fields in request: {', '.join(sorted(unexpected))}"}
        )


def validate_amount(value, min_val=_TOP_UP_MIN, max_val=_TOP_UP_MAX):
    """
    Validates a monetary amount — must be a positive Decimal within an accepted range.
    Returns the parsed Decimal value on success.
    """
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise serializers.ValidationError({'amount': 'Must be a valid number.'})

    if amount <= 0:
        raise serializers.ValidationError({'amount': 'Must be greater than zero.'})
    if amount < min_val:
        raise serializers.ValidationError({'amount': f'Minimum top-up is RM {min_val:.2f}.'})
    if amount > max_val:
        raise serializers.ValidationError({'amount': f'Maximum top-up is RM {max_val:.2f}.'})

    return amount


def validate_price_param(value, param_name='price'):
    """
    Validates a price query parameter — must be a non-negative number within a sane ceiling.
    Returns the parsed float value on success.
    """
    try:
        price = float(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError({param_name: 'Must be a valid number.'})

    if price < 0:
        raise serializers.ValidationError({param_name: 'Cannot be negative.'})
    if price > 999_999:
        raise serializers.ValidationError({param_name: 'Exceeds maximum allowed value.'})

    return price


def validate_top_up_payload(data):
    """
    Validates the top-up request body — rejects extra fields and enforces amount constraints.
    Returns the validated Decimal amount.
    """
    reject_extra_fields(data, _TOP_UP_ALLOWED_FIELDS)
    return validate_amount(data.get('amount'))


def validate_suggest_price_payload(data):
    """
    Validates the suggest-price request body — rejects extra fields and enforces numeric types.
    Returns a clean dict of validated parameters.
    """
    reject_extra_fields(data, _SUGGEST_PRICE_ALLOWED_FIELDS)

    errors = {}

    try:
        condition_score = float(data.get('condition_score', 8.0))
        if not (0.0 <= condition_score <= 10.0):
            errors['condition_score'] = 'Must be between 0 and 10.'
    except (TypeError, ValueError):
        errors['condition_score'] = 'Must be a valid number.'
        condition_score = 8.0  # fallback so later code doesn't blow up on KeyError

    try:
        duration_days = int(data.get('duration_days', 5))
        if not (0 <= duration_days <= 3650):
            errors['duration_days'] = 'Must be between 0 and 3650 days.'
    except (TypeError, ValueError):
        errors['duration_days'] = 'Must be a valid integer.'
        duration_days = 5

    try:
        original_price = float(data.get('original_price', 1000.0))
        if original_price < 0 or original_price > 9_999_999:
            errors['original_price'] = 'Must be a positive number below 9,999,999.'
    except (TypeError, ValueError):
        errors['original_price'] = 'Must be a valid number.'
        original_price = 1000.0

    if errors:
        raise serializers.ValidationError(errors)

    return {
        # Truncate free-text fields to prevent abnormally long inputs.
        'category': str(data.get('category', 'Tech'))[:50],
        'brand': str(data.get('brand', 'Generic'))[:50],
        'condition_score': condition_score,
        'duration_days': duration_days,
        'original_price': original_price,
    }
