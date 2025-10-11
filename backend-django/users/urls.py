from django.urls import path
from .auth import register_view, login_view, verify_email, resend_verification, create_test_user, me_view, health_check
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('me/', me_view, name='me'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('create-test-user/', create_test_user, name='create_test_user'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]