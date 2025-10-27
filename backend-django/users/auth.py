from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .email_service import send_verification_email, verify_email_token

User = get_user_model()

from .email_service import send_verification_email

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    try:
        data = request.data
        # Ensure username is set to email if not provided
        if 'username' not in data:
            data = data.copy()
            data['username'] = data.get('email')

        # Set the default avatar ID
        data = data.copy()
        data['avatar_id'] = '694c83e2-8895-4a98-bd16-56332ca3f449'
        
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            # Save user as active (temporarily skip email verification)
            user = serializer.save(is_active=True, avatar_id=data['avatar_id'])
            
            # Send verification email (optional)
            # email_sent = send_verification_email(user)
            
            refresh = RefreshToken.for_user(user)
            response_data = {
                'user': serializer.data,
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'message': 'Registration successful.',
                # 'email_sent': email_sent
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(
            {'error': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    # For email/password auth, try with both username and email
    user = authenticate(username=email, password=password) or authenticate(email=email, password=password)
    
    if user is not None:
        # Removed is_active check for now
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

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