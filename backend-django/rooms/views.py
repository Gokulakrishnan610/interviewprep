from rest_framework import viewsets, permissions, filters
from .models import InterviewRoomTemplate
from .serializers import RoomTemplateListSerializer, RoomTemplateDetailSerializer


class RoomTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/rooms/        — list all active room templates
    GET /api/rooms/{id}/   — full detail for a single room

    Read-only: rooms are managed by admins, not created by users.
    Supports filtering by round_type, difficulty, and company via query params.
    Supports free-text search on title and description.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'company', 'role']
    ordering_fields = ['company', 'role', 'difficulty', 'duration_minutes']
    ordering = ['company', 'role']

    def get_queryset(self):
        qs = InterviewRoomTemplate.objects.filter(is_active=True)

        # Optional query param filters
        round_type = self.request.query_params.get('round_type')
        difficulty = self.request.query_params.get('difficulty')
        company = self.request.query_params.get('company')

        if round_type:
            qs = qs.filter(round_type=round_type)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        if company:
            qs = qs.filter(company__iexact=company)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RoomTemplateDetailSerializer
        return RoomTemplateListSerializer
