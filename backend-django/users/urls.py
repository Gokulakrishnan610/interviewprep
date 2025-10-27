from django.urls import path
from .auth import register_view, login_view, verify_email, resend_verification
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserViewSet.as_view({'get': 'me'}), name='me'),
]