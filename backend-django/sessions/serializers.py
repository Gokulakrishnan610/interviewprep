from rest_framework import serializers
from rooms.serializers import RoomTemplateListSerializer
from .models import InterviewSession, InterviewTurn, FeedbackReport


class InterviewTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewTurn
        fields = [
            'id', 'turn_number',
            'question_text', 'asked_at',
            'answer_text', 'answer_audio_url', 'answered_at',
        ]
        read_only_fields = ['id']


class FeedbackReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackReport
        fields = [
            'id',
            'overall_score',
            'dimension_scores',
            'strengths',
            'weaknesses',
            'recommendations',
            'created_at',
        ]
        read_only_fields = fields


class InterviewSessionListSerializer(serializers.ModelSerializer):
    """
    Compact shape for GET /api/sessions/ (history list).
    Includes the room template summary and report score if available.
    """
    room_template = RoomTemplateListSerializer(read_only=True)
    overall_score = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = [
            'id', 'room_template', 'status',
            'livekit_room_name',
            'started_at', 'ended_at', 'created_at',
            'overall_score',
        ]

    def get_overall_score(self, obj):
        if hasattr(obj, 'report') and obj.report:
            return obj.report.overall_score
        return None


class InterviewSessionDetailSerializer(serializers.ModelSerializer):
    """
    Full shape for GET /api/sessions/{id}/.
    Includes turns and report.
    """
    room_template = RoomTemplateListSerializer(read_only=True)
    turns = InterviewTurnSerializer(many=True, read_only=True)
    report = FeedbackReportSerializer(read_only=True)

    class Meta:
        model = InterviewSession
        fields = [
            'id', 'room_template', 'status',
            'livekit_room_name',
            'started_at', 'ended_at', 'created_at',
            'turns', 'report',
        ]


class SessionCreateSerializer(serializers.Serializer):
    """
    Input for POST /api/sessions/.
    User supplies only the room_template_id.
    Everything else is set by the view.
    """
    room_template_id = serializers.IntegerField()

    def validate_room_template_id(self, value):
        from rooms.models import InterviewRoomTemplate
        try:
            template = InterviewRoomTemplate.objects.get(pk=value, is_active=True)
        except InterviewRoomTemplate.DoesNotExist:
            raise serializers.ValidationError('Room template not found or inactive.')
        return value


class FeedbackReportCreateSerializer(serializers.ModelSerializer):
    """
    Input for POST /api/sessions/{id}/report/.
    Called by the ai_service after analysis — accepts the full report payload.
    """
    class Meta:
        model = FeedbackReport
        fields = [
            'overall_score',
            'dimension_scores',
            'strengths',
            'weaknesses',
            'recommendations',
            'raw_ai_response',
        ]
