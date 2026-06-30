from django.db import models
from django.conf import settings

class InterviewSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    room_token = models.CharField(max_length=500, blank=True, null=True)  # LiveKit room token
    room_name = models.CharField(max_length=100, unique=True, default='default-room')  # Unique room identifier
    avatar_id = models.UUIDField(default='694c83e2-8895-4a98-bd16-56332ca3f449')  # BeyondPresence avatar ID
    interview_type = models.CharField(
        max_length=20,
        choices=[
            ('technical', 'Technical'),
            ('behavioral', 'Behavioral'),
            ('mixed', 'Mixed')
        ]
    )
    difficulty_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced')
        ]
    )
    duration_minutes = models.IntegerField(default=30)
    status = models.CharField(
        max_length=20,
        choices=[
            ('scheduled', 'Scheduled'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled')
        ],
        default='scheduled'
    )
    scheduled_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'legacy_interview_sessions'

class InterviewFeedback(models.Model):
    session = models.OneToOneField(InterviewSession, on_delete=models.CASCADE)
    technical_score = models.FloatField(null=True, blank=True)
    communication_score = models.FloatField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    feedback_text = models.TextField()
    improvement_areas = models.TextField()
    strengths = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'interview_feedback'

class InterviewResponse(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE)
    question_text = models.TextField()
    response_text = models.TextField()
    response_audio_url = models.URLField(null=True, blank=True)
    sentiment_score = models.FloatField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'interview_responses'
