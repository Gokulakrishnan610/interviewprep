import logging
import uuid

from django.conf import settings as django_settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from livekit.api import AccessToken, VideoGrants

from rooms.models import InterviewRoomTemplate
from .models import InterviewSession, FeedbackReport
from .serializers import (
    InterviewSessionListSerializer,
    InterviewSessionDetailSerializer,
    SessionCreateSerializer,
    FeedbackReportSerializer,
    FeedbackReportCreateSerializer,
)

logger = logging.getLogger(__name__)


def _generate_livekit_token(user, room_name: str) -> str:
    """
    Generate a signed LiveKit access token using the official livekit-api SDK.

    Uses LIVEKIT_API_KEY and LIVEKIT_API_SECRET from Django settings (sourced
    from .env).  Grants room_join for the given room_name, identified by the
    user's pk, with their display name.
    """
    display_name = f'{user.first_name} {user.last_name}'.strip() or user.email

    grants = VideoGrants(room_join=True, room=room_name)

    token = (
        AccessToken(
            api_key=django_settings.LIVEKIT_API_KEY,
            api_secret=django_settings.LIVEKIT_API_SECRET,
        )
        .with_identity(str(user.pk))
        .with_name(display_name)
        .with_grants(grants)
    )

    return token.to_jwt()


class InterviewSessionViewSet(viewsets.GenericViewSet):
    """
    POST   /api/sessions/              — create a new session from a room template
    GET    /api/sessions/              — list the current user's sessions (history)
    GET    /api/sessions/{id}/         — full session detail with turns and report
    POST   /api/sessions/{id}/start/   — begin the session: status → in_progress,
                                          generates LiveKit room + token
    POST   /api/sessions/{id}/complete/ — mark session completed (called by client
                                           or ai_service when interview ends)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            InterviewSession.objects
            .filter(user=self.request.user)
            .select_related('room_template', 'report')
            .prefetch_related('turns')
        )

    # ------------------------------------------------------------------ list
    def list(self, request):
        qs = self.get_queryset()
        serializer = InterviewSessionListSerializer(qs, many=True)
        return Response(serializer.data)

    # ---------------------------------------------------------------- create
    def create(self, request):
        serializer = SessionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        template = get_object_or_404(
            InterviewRoomTemplate,
            pk=serializer.validated_data['room_template_id'],
            is_active=True,
        )

        session = InterviewSession.objects.create(
            user=request.user,
            room_template=template,
            status='scheduled',
        )

        return Response(
            InterviewSessionDetailSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------------- retrieve
    def retrieve(self, request, pk=None):
        session = get_object_or_404(self.get_queryset(), pk=pk)
        return Response(InterviewSessionDetailSerializer(session).data)

    # ----------------------------------------------------------------- start
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        POST /api/sessions/{id}/start/

        Validates ownership (get_queryset already filters by user).
        Transitions status: scheduled → in_progress.
        Generates a unique LiveKit room name and a signed access token.
        Returns the token and room details so the client can connect directly.

        Idempotent for in_progress sessions: returns existing room + a fresh token
        so a reconnect after a page refresh works without creating a new room.
        """
        session = get_object_or_404(self.get_queryset(), pk=pk)

        if session.status == 'in_progress':
            # Already started — issue a fresh token for the existing room.
            livekit_token = _generate_livekit_token(request.user, session.livekit_room_name)
            return Response({
                'session': InterviewSessionDetailSerializer(session).data,
                'livekit_token': livekit_token,
                'livekit_room_name': session.livekit_room_name,
                'livekit_url': django_settings.LIVEKIT_URL,
            })

        if session.status != 'scheduled':
            return Response(
                {'error': f'Session cannot be started from status "{session.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate a unique LiveKit room name and sign the token.
        room_name = f'interview-{uuid.uuid4().hex[:12]}'
        livekit_token = _generate_livekit_token(request.user, room_name)

        session.status = 'in_progress'
        session.livekit_room_name = room_name
        session.started_at = timezone.now()
        session.save(update_fields=['status', 'livekit_room_name', 'started_at'])

        return Response({
            'session': InterviewSessionDetailSerializer(session).data,
            'livekit_token': livekit_token,
            'livekit_room_name': room_name,
            'livekit_url': django_settings.LIVEKIT_URL,
        })

    # -------------------------------------------------------------- complete
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Marks the session as completed.
        Called by the frontend (or ai_service) once the interview has ended.
        Does not require a report to already exist.
        """
        session = get_object_or_404(self.get_queryset(), pk=pk)

        if session.status != 'in_progress':
            return Response(
                {'error': f'Session cannot be completed from status "{session.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.status = 'completed'
        session.ended_at = timezone.now()
        session.save(update_fields=['status', 'ended_at'])

        return Response(InterviewSessionDetailSerializer(session).data)

    # ---------------------------------------------------------------- report
    @action(detail=True, methods=['get', 'post'], url_path='report')
    def report(self, request, pk=None):
        """
        GET  /api/sessions/{id}/report/ — retrieve the feedback report
        POST /api/sessions/{id}/report/ — create the report (called by ai_service)

        The POST endpoint is protected by IsAuthenticated.
        In Phase G the ai_service will call this endpoint using the user's
        JWT obtained at WebSocket connect time.
        """
        session = get_object_or_404(self.get_queryset(), pk=pk)

        if request.method == 'GET':
            if not hasattr(session, 'report') or session.report is None:
                return Response(
                    {'error': 'No report available yet for this session.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(FeedbackReportSerializer(session.report).data)

        # POST — create report
        if session.status != 'completed':
            return Response(
                {'error': 'Report can only be submitted for completed sessions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if hasattr(session, 'report') and session.report:
            return Response(
                {'error': 'Report already exists for this session.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FeedbackReportCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        report = FeedbackReport.objects.create(
            session=session,
            **serializer.validated_data,
        )
        return Response(
            FeedbackReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )

