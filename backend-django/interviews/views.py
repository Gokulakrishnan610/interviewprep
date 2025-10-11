import uuid
import jwt
import time
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InterviewSession, InterviewResponse, InterviewFeedback
from .serializers import (
    InterviewSessionSerializer,
    InterviewResponseSerializer,
    InterviewFeedbackSerializer
)
from django.shortcuts import get_object_or_404
from django.conf import settings
from core.services import fastapi_service, livekit_service

class InterviewSessionViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return InterviewSession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Generate unique room name
        room_name = f"interview-{uuid.uuid4().hex[:12]}"
        
        # Generate LiveKit room token
        room_token = self.generate_room_token(room_name)
        
        # Save with room details and avatar
        serializer.save(
            user=self.request.user,
            room_name=room_name,
            room_token=room_token,
            avatar_id=self.request.user.avatar_id or '694c83e2-8895-4a98-bd16-56332ca3f449'
        )

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        interview = self.get_object()
        if interview.status != 'scheduled':
            return Response(
                {'error': 'Interview cannot be started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize session with FastAPI
        session_data = fastapi_service.initialize_interview(
            user_id=request.user.id,
            interview_id=interview.id,
            interview_type=interview.interview_type,
            difficulty_level=interview.difficulty_level
        )
        
        # Create or update LiveKit room token if needed
        if not interview.room_token:
            interview.room_token = self.generate_room_token(interview.room_name)
            
        interview.status = 'in_progress'
        interview.save()
        
        # Return session data with room details
        return Response({
            **session_data,
            'room_name': interview.room_name,
            'room_token': interview.room_token,
            'avatar_id': str(interview.avatar_id)
        })
    
    @action(detail=True, methods=['post'])
    def submit_response(self, request, pk=None):
        interview = self.get_object()
        if interview.status != 'in_progress':
            return Response(
                {'error': 'Interview is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process response with FastAPI
        response_data = fastapi_service.process_response(
            interview_id=interview.id,
            question=request.data.get('question'),
            response=request.data.get('response'),
            audio_url=request.data.get('audio_url')
        )
        
        # Create response record
        response = InterviewResponse.objects.create(
            session=interview,
            question_text=request.data.get('question'),
            response_text=request.data.get('response'),
            response_audio_url=request.data.get('audio_url'),
            sentiment_score=response_data.get('sentiment_score'),
            confidence_score=response_data.get('confidence_score')
        )
        
        return Response(InterviewResponseSerializer(response).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        interview = self.get_object()
        if interview.status != 'in_progress':
            return Response(
                {'error': 'Interview is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get final analysis from FastAPI
        analysis = fastapi_service.analyze_interview(interview.id)
        
        # Create feedback record
        feedback = InterviewFeedback.objects.create(
            session=interview,
            technical_score=analysis.get('technical_score'),
            communication_score=analysis.get('communication_score'),
            confidence_score=analysis.get('confidence_score'),
            overall_score=analysis.get('overall_score'),
            feedback_text=analysis.get('feedback'),
            improvement_areas=analysis.get('improvement_areas'),
            strengths=analysis.get('strengths')
        )
        
        interview.status = 'completed'
        interview.save()
        
        return Response({
            'feedback': InterviewFeedbackSerializer(feedback).data,
            'session': InterviewSessionSerializer(interview).data
        })
        
    def generate_room_token(self, room_name):
        """Generate a LiveKit room token"""
        api_key = settings.LIVEKIT_API_KEY
        api_secret = settings.LIVEKIT_API_SECRET
        
        now = int(time.time())
        exp = now + (24 * 60 * 60)  # 24 hours from now
        
        payload = {
            'iss': api_key,
            'sub': str(self.request.user.id),
            'exp': exp,
            'nbf': now,
            'room': room_name,
            'metadata': {
                'name': f"{self.request.user.first_name} {self.request.user.last_name}",
                'avatar_id': str(self.request.user.avatar_id or '694c83e2-8895-4a98-bd16-56332ca3f449')
            }
        }
        
        token = jwt.encode(payload, api_secret, algorithm='HS256')
        return token
