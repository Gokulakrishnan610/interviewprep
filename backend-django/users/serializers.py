from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'preferred_language', 'interview_credits', 'skill_level']

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 
                 'is_email_verified', 'profile_picture', 'avatar_id']
        read_only_fields = ['is_email_verified']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False}
        }
    
    def validate_email(self, value):
        # Only validate email uniqueness during creation, not updates
        if self.instance is None and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        try:
            # Extract password data
            password = validated_data.pop('password')
            email = validated_data.get('email')
            
            # Ensure username is email
            validated_data['username'] = email
            
            # Create user using the manager
            user = User.objects.create_user(
                email=email,
                password=password,
                **validated_data
            )
            
            # Create default profile
            UserProfile.objects.create(user=user)
            
            return user
            
        except Exception as e:
            raise serializers.ValidationError(str(e))

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance