from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth import (
    register_view,
    login_view,
    verify_email,
    resend_verification,
    me_view,
    update_me_view,
)

urlpatterns = [
    # Auth
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-verification/', resend_verification, name='resend_verification'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Current user
    path('me/', me_view, name='me'),
    path('me/update/', update_me_view, name='update_me'),
]
