from django.contrib import admin
from .models import InterviewSession, InterviewTurn, FeedbackReport


class InterviewTurnInline(admin.TabularInline):
    model = InterviewTurn
    extra = 0
    readonly_fields = ['turn_number', 'question_text', 'asked_at',
                       'answer_text', 'answered_at']
    can_delete = False


class FeedbackReportInline(admin.StackedInline):
    model = FeedbackReport
    extra = 0
    readonly_fields = ['overall_score', 'dimension_scores', 'strengths',
                       'weaknesses', 'recommendations', 'created_at']
    can_delete = False


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'room_template', 'status', 'created_at', 'ended_at']
    list_filter = ['status', 'room_template__round_type', 'room_template__difficulty']
    search_fields = ['user__email', 'room_template__title', 'livekit_room_name']
    readonly_fields = ['created_at', 'started_at', 'ended_at', 'livekit_room_name']
    inlines = [InterviewTurnInline, FeedbackReportInline]


@admin.register(InterviewTurn)
class InterviewTurnAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'turn_number', 'asked_at', 'answered_at']
    list_filter = ['session__status']
    search_fields = ['session__user__email', 'question_text']
    readonly_fields = ['asked_at', 'answered_at']


@admin.register(FeedbackReport)
class FeedbackReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'overall_score', 'created_at']
    search_fields = ['session__user__email']
    readonly_fields = ['created_at']
