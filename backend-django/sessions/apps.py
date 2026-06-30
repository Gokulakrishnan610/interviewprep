from django.apps import AppConfig
class SessionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sessions'
    label = 'interview_sessions'  # avoids clash with django.contrib.sessions