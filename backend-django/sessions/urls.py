from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewSessionViewSet

router = DefaultRouter()
router.register('', InterviewSessionViewSet, basename='interview-session')

# DefaultRouter auto-generates:
#   GET    /api/sessions/              → list
#   POST   /api/sessions/              → create
#   GET    /api/sessions/{id}/         → retrieve
#
# @action routes auto-generated:
#   POST   /api/sessions/{id}/start/    → start
#   POST   /api/sessions/{id}/complete/ → complete
#   GET    /api/sessions/{id}/report/   → report (GET)
#   POST   /api/sessions/{id}/report/   → report (POST)

urlpatterns = [
    path('', include(router.urls)),
]
