import uuid
from django.db import models
from django.conf import settings
from rooms.models import InterviewRoomTemplate


class InterviewSession(models.Model):
    """
    A single interview attempt by a user against a room template.
    One session = one LiveKit room = one set of turns = one feedback report.
    """

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interview_sessions',
    )
    room_template = models.ForeignKey(
        InterviewRoomTemplate,
        on_delete=models.PROTECT,   # Don't delete template if sessions exist
        related_name='sessions',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')

    # LiveKit room — generated on start, blank until then
    livekit_room_name = models.CharField(max_length=120, blank=True, default='')

    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.room_template.title} [{self.status}]'


class InterviewTurn(models.Model):
    """
    A single question-answer exchange within a session.
    Created by the ai_service via WebSocket during the interview,
    or can be written directly for non-real-time flows.
    """
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name='turns',
    )
    turn_number = models.PositiveIntegerField()

    # AI side
    question_text = models.TextField()
    asked_at = models.DateTimeField(null=True, blank=True)

    # User side — populated as the answer comes in
    answer_text = models.TextField(blank=True, default='')
    answer_audio_url = models.URLField(blank=True, default='')
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'interview_turns'
        ordering = ['turn_number']
        unique_together = [('session', 'turn_number')]

    def __str__(self):
        return f'Session {self.session_id} — Turn {self.turn_number}'


class FeedbackReport(models.Model):
    """
    Final structured scorecard for a completed session.
    Written by the ai_service once the interview ends and
    all answers have been analysed.
    """
    session = models.OneToOneField(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name='report',
    )

    overall_score = models.FloatField(null=True, blank=True)

    # JSON objects — shape mirrors the room template's rubric_dimensions
    # e.g. {"clarity": 8, "structure": 7, "ownership": 9, ...}
    dimension_scores = models.JSONField(default=dict)

    # JSON lists of strings
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)

    # Raw Gemini response preserved for debugging / reprocessing
    raw_ai_response = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback_reports'

    def __str__(self):
        return f'Report for Session {self.session_id} — {self.overall_score}/10'
