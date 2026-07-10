"""
Configures the Django application settings and registers app-level signals.
"""
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Register signals receivers upon application startup
        import api.signals
