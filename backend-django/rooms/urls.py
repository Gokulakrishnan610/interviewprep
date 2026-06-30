from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomTemplateViewSet

router = DefaultRouter()
router.register('', RoomTemplateViewSet, basename='room-template')

urlpatterns = [
    path('', include(router.urls)),
]
