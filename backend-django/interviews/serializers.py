from rest_framework import serializers
from .models import InterviewSession, InterviewFeedback, InterviewResponse

class InterviewResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewResponse
        fields = ['id', 'question_text', 'response_text', 'response_audio_url',
                 'sentiment_score', 'confidence_score', 'created_at']

class InterviewFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewFeedback
        fields = ['id', 'technical_score', 'communication_score', 'confidence_score',
                 'overall_score', 'feedback_text', 'improvement_areas', 'strengths',
                 'created_at']

class InterviewSessionSerializer(serializers.ModelSerializer):
    responses = InterviewResponseSerializer(many=True, read_only=True)
    feedback = InterviewFeedbackSerializer(read_only=True)
    
    class Meta:
        model = InterviewSession
        fields = ['id', 'user', 'title', 'interview_type', 'difficulty_level',
                 'duration_minutes', 'status', 'scheduled_time', 'created_at',
                 'updated_at', 'responses', 'feedback']
        read_only_fields = ['user']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)