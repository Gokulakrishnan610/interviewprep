from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import jwt
from datetime import datetime, timedelta

def generate_verification_token(user):
    """Generate a verification token for email verification"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(days=1)  # Token expires in 1 day
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def send_verification_email(user):
    """Send verification email to user"""
    token = generate_verification_token(user)
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Email content
    context = {
        'user': user,
        'verification_url': verification_url
    }
    
    # Create HTML email content
    html_message = render_to_string('users/email/verify_email.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject='Verify Your Email Address',
            message=plain_message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

def verify_email_token(token):
    """Verify the email verification token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None