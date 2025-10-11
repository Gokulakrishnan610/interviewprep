from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .email_service import send_verification_email, verify_email_token
from asgiref.sync import sync_to_async
import asyncio

User = get_user_model()

from .email_service import send_verification_email

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint"""
    return Response({'status': 'ok', 'message': 'Django backend is running'})

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    try:
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({
                'error': 'A user with this email already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=False  # Require email verification
        )
        
        # Create user profile
        from .models import UserProfile
        UserProfile.objects.create(user=user)
        
        # Send verification email
        try:
            email_sent = send_verification_email(user)
            message = 'Registration successful. Please check your email to verify your account.' if email_sent else 'Registration successful, but verification email could not be sent.'
        except Exception:
            email_sent = False
            message = 'Registration successful, but verification email could not be sent.'
        
        return Response({
            'message': message,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active
            },
            'email_sent': email_sent
        }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if user exists
        user = User.objects.get(email=email)
        
        # Check if user is active
        if not user.is_active:
            return Response({
                'error': 'Please verify your email address before logging in.',
                'requires_verification': True
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check password
        if user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active
                },
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
            })
        else:
            return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)
            
    except User.DoesNotExist:
        return Response({'error': 'User not found. Please register first.'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({'error': f'Login failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Verification token is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    payload = verify_email_token(token)
    if not payload:
        return Response({'error': 'Invalid or expired verification token'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(id=payload['user_id'], email=payload['email'])
        if user.is_active:
            return Response({'message': 'Email already verified'})
        
        user.is_active = True
        user.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Email verified successfully',
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        if user.is_active:
            return Response({'message': 'Email already verified'})
        
        email_sent = send_verification_email(user)
        if email_sent:
            return Response({'message': 'Verification email sent successfully'})
        else:
            return Response({'error': 'Failed to send verification email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_test_user(request):
    """Create a test user for debugging purposes"""
    try:
        email = request.data.get('email', 'test@example.com')
        password = request.data.get('password', 'testpassword123')
        first_name = request.data.get('first_name', 'Test')
        last_name = request.data.get('last_name', 'User')
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_active=True  # Activate immediately for testing
        )
        
        # Return simple user data without serializer
        return Response({
            'message': 'Test user created successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Get current user information"""
    try:
        user = request.user
        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active
            }
        })
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)