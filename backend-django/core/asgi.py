"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import WebSocket consumers
try:
    from interviews.consumers import InterviewConsumer
    print("✅ InterviewConsumer imported successfully")
except ImportError as e:
    print(f"❌ Failed to import InterviewConsumer: {e}")
    InterviewConsumer = None

websocket_urlpatterns = [
    path('ws/<str:session_id>', InterviewConsumer.as_asgi()) if InterviewConsumer else None,
]
# Filter out None values
websocket_urlpatterns = [pattern for pattern in websocket_urlpatterns if pattern is not None]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(
        websocket_urlpatterns
    ),
})
