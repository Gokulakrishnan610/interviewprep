from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserProfileSerializer
from .models import UserProfile
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny])
    @method_decorator(ensure_csrf_cookie)
    def csrf(self, request):
        return Response({'csrfToken': get_token(request)})
    
    def get_permissions(self):
        if self.action in ['create', 'verify_email', 'csrf']:
            return [permissions.AllowAny()]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            return User.objects.filter(id=self.request.user.id)
        return User.objects.all()
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            # Send verification email
            verification_token = str(refresh.access_token)
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
            
            send_mail(
                'Verify your email',
                f'Please click this link to verify your email: {verification_url}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
            return Response({
                'user': serializer.data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Verification email sent'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def verify_email(self, request):
        token = request.data.get('token')
        try:
            # Validate token and get user
            token_obj = RefreshToken(token)
            user_id = token_obj['user_id']
            user = User.objects.get(id=user_id)
            user.is_email_verified = True
            user.save()
            return Response({'message': 'Email verified successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
