from django.contrib import admin
from .models import InterviewRoomTemplate


@admin.register(InterviewRoomTemplate)
class InterviewRoomTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'company', 'role', 'round_type', 'difficulty',
        'duration_minutes', 'is_active',
    ]
    list_filter = ['round_type', 'difficulty', 'company', 'is_active']
    search_fields = ['title', 'company', 'role', 'description']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at']
    fieldsets = [
        ('Identity', {
            'fields': ['slug', 'title', 'description', 'is_active'],
        }),
        ('Classification', {
            'fields': ['company', 'role', 'round_type', 'difficulty'],
        }),
        ('Session Parameters', {
            'fields': ['duration_minutes'],
        }),
        ('AI Interviewer', {
            'fields': ['interviewer_name', 'interviewer_persona'],
        }),
        ('Scoring', {
            'fields': ['competencies', 'rubric_dimensions'],
            'classes': ['collapse'],
        }),
        ('Metadata', {
            'fields': ['created_at'],
        }),
    ]
