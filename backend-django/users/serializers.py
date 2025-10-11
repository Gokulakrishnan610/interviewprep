from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'preferred_language', 'interview_credits', 'skill_level']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 
                 'is_email_verified', 'profile_picture', 'profile', 'avatar_id']
        read_only_fields = ['is_email_verified']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True}
        }
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        try:
            # Extract profile and password data
            profile_data = validated_data.pop('profile', None)
            password = validated_data.pop('password')
            email = validated_data.get('email')
            
            # Ensure username is email
            validated_data['username'] = email
            
            # Create user instance but don't save to DB yet
            user = User(**validated_data)
            
            # Set password properly
            user.set_password(password)
            
            # Save user
            user.save()
            
            # Create profile if profile data exists
            if profile_data:
                UserProfile.objects.create(user=user, **profile_data)
            else:
                # Create default profile
                UserProfile.objects.create(user=user)
            
            return user
            
        except Exception as e:
            raise serializers.ValidationError(str(e))

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        if profile_data and hasattr(instance, 'profile'):
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()
            
        instance.save()
        return instance