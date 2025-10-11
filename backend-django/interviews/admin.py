from django.contrib import admin
from .models import InterviewSession, InterviewFeedback, InterviewResponse

@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'interview_type', 'status', 'scheduled_time')
    list_filter = ('status', 'interview_type', 'difficulty_level')
    search_fields = ('title', 'user__username', 'user__email')
    date_hierarchy = 'scheduled_time'
    ordering = ('-scheduled_time',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'interview_type', 'difficulty_level')
        }),
        ('Schedule & Status', {
            'fields': ('scheduled_time', 'duration_minutes', 'status')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_user', 'technical_score', 'communication_score', 'overall_score')
    list_filter = ('created_at',)
    search_fields = ('session__user__username', 'feedback_text')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Session Information', {
            'fields': ('session',)
        }),
        ('Scores', {
            'fields': ('technical_score', 'communication_score', 'confidence_score', 'overall_score')
        }),
        ('Detailed Feedback', {
            'fields': ('feedback_text', 'improvement_areas', 'strengths')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def get_user(self, obj):
        return obj.session.user
    get_user.short_description = 'User'
    get_user.admin_order_field = 'session__user'

@admin.register(InterviewResponse)
class InterviewResponseAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_user', 'get_session_title', 'sentiment_score', 'confidence_score')
    list_filter = ('created_at',)
    search_fields = ('session__user__username', 'question_text', 'response_text')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Session Information', {
            'fields': ('session',)
        }),
        ('Question & Response', {
            'fields': ('question_text', 'response_text', 'response_audio_url')
        }),
        ('Analysis', {
            'fields': ('sentiment_score', 'confidence_score')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def get_user(self, obj):
        return obj.session.user
    get_user.short_description = 'User'
    get_user.admin_order_field = 'session__user'

    def get_session_title(self, obj):
        return obj.session.title
    get_session_title.short_description = 'Session Title'
    get_session_title.admin_order_field = 'session__title'
