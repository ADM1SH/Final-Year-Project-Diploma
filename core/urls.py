"""
Defines main URL configurations for the marketplace web application,
registering administration and API modules.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

urlpatterns = [
    # Access the admin dashboard.
    path('admin/', admin.site.urls),
    
    # Access the marketplace API.
    path('api/', include('api.urls')),
]

# Enable media serving for development.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

def custom_404(request, exception=None):
    return JsonResponse({"error": "Not found"}, status=404)

def custom_500(request, exception=None):
    return JsonResponse({"error": "An internal server error occurred. Please try again later."}, status=500)

def custom_403(request, exception=None):
    return JsonResponse({"error": "Permission denied"}, status=403)

handler404 = custom_404
handler500 = custom_500
handler403 = custom_403
