import uuid
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from rooms.models import InterviewRoomTemplate
from .models import InterviewSession, FeedbackReport
from .serializers import (
    InterviewSessionListSerializer,
    InterviewSessionDetailSerializer,
    SessionCreateSerializer,
    FeedbackReportSerializer,
    FeedbackReportCreateSerializer,
)


def _generate_livekit_token(user, room_name: str) -> str:
    """
    Generate a LiveKit access token with VideoGrant using the livekit-server-sdk.
    Returns the signed JWT string.

    NOTE: This uses the livekit Python SDK (livekit>=0.11).
    If the SDK is not yet installed, it falls back to a stub so Django
    does not crash — the token will say 'livekit-sdk-not-installed'.
    Phase D will replace this stub with the real SDK call.
    """
    try:
        from livekit import AccessToken, VideoGrants
        grants = VideoGrants(room_join=True, room=room_name)
        token = (
            AccessToken()
            .with_identity(str(user.id))
            .with_name(f'{user.first_name} {user.last_name}'.strip() or user.email)
            .with_grants(grants)
        )
        from django.conf import settings as django_settings
        return token.to_jwt(
            api_key=django_settings.LIVEKIT_API_KEY,
            api_secret=django_settings.LIVEKIT_API_SECRET,
        )
    except ImportError:
        # livekit SDK not yet installed — Phase D will fix this
        return 'livekit-sdk-not-installed'
    except Exception as exc:
        # Log and return empty string so the session can still be created
        import logging
        logging.getLogger(__name__).error('LiveKit token generation failed: %s', exc)
        return ''


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
        Transitions the session to in_progress, generates a LiveKit room
        name and token, and returns both to the client.
        The client then connects to LiveKit directly.
        """
        session = get_object_or_404(self.get_queryset(), pk=pk)

        if session.status != 'scheduled':
            return Response(
                {'error': f'Session cannot be started from status "{session.status}".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate a unique LiveKit room name
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
            'livekit_url': _get_livekit_url(),
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


def _get_livekit_url():
    from django.conf import settings as django_settings
    return getattr(django_settings, 'LIVEKIT_API_URL', '')
