# urls.py
# Main route configuration for MyPreLove.
# This file links admin and API endpoints.

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Access the admin dashboard.
    path('admin/', admin.site.urls),
    
    # Access the marketplace API.
    path('api/', include('api.urls')),
]

# Enable media serving for development.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
