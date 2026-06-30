from django.db import models


class InterviewRoomTemplate(models.Model):
    """
    A reusable interview room definition.
    Instances are created/managed by admins via Django admin or fixtures.
    Users browse these and create InterviewSessions against them.
    """

    ROUND_TYPE_CHOICES = [
        ('behavioral', 'Behavioral'),
        ('technical', 'Technical'),
        ('system_design', 'System Design'),
        ('hr', 'HR'),
        ('mixed', 'Mixed'),
    ]

    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    # Identity
    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Classification
    company = models.CharField(
        max_length=100, blank=True,
        help_text='Leave blank for generic/role-based rooms (e.g. "Amazon", "Google")',
    )
    role = models.CharField(
        max_length=100,
        help_text='e.g. "SDE-1", "Frontend Developer", "HR Generalist"',
    )
    round_type = models.CharField(max_length=20, choices=ROUND_TYPE_CHOICES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)

    # Session parameters
    duration_minutes = models.PositiveIntegerField(default=30)

    # AI interviewer persona
    interviewer_name = models.CharField(max_length=100, default='Alex')
    interviewer_persona = models.TextField(
        help_text='Personality and style description fed to the AI.',
    )

    # Competencies tested — stored as a JSON list of strings
    # e.g. ["ownership", "impact", "conflict_resolution"]
    competencies = models.JSONField(default=list)

    # Scoring rubric — stored as a JSON list of {dimension, description, max_score}
    # e.g. [{"dimension": "clarity", "description": "...", "max_score": 10}]
    rubric_dimensions = models.JSONField(default=list)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_room_templates'
        ordering = ['company', 'role', 'difficulty']

    def __str__(self):
        prefix = f'{self.company} — ' if self.company else ''
        return f'{prefix}{self.title} ({self.get_difficulty_display()})'
