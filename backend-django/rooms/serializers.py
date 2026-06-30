from rest_framework import serializers
from .models import InterviewRoomTemplate


class RoomTemplateListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the room browser (GET /api/rooms/).
    Omits the full rubric and persona to keep list payloads small.
    """
    round_type_display = serializers.CharField(
        source='get_round_type_display', read_only=True
    )
    difficulty_display = serializers.CharField(
        source='get_difficulty_display', read_only=True
    )

    class Meta:
        model = InterviewRoomTemplate
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'company',
            'role',
            'round_type',
            'round_type_display',
            'difficulty',
            'difficulty_display',
            'duration_minutes',
            'interviewer_name',
            'competencies',
            'is_active',
        ]


class RoomTemplateDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the room detail view (GET /api/rooms/{id}/).
    Includes rubric dimensions and interviewer persona
    so the session start flow has full context.
    """
    round_type_display = serializers.CharField(
        source='get_round_type_display', read_only=True
    )
    difficulty_display = serializers.CharField(
        source='get_difficulty_display', read_only=True
    )

    class Meta:
        model = InterviewRoomTemplate
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'company',
            'role',
            'round_type',
            'round_type_display',
            'difficulty',
            'difficulty_display',
            'duration_minutes',
            'interviewer_name',
            'interviewer_persona',
            'competencies',
            'rubric_dimensions',
            'is_active',
            'created_at',
        ]
