"""rooms and sessions tables

Revision ID: 0002_rooms_and_sessions
Revises: 24d61180ed72
Create Date: 2025-06-30

Adds:
  - interview_room_templates
  - interview_sessions
  - interview_turns
  - feedback_reports
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0002_rooms_and_sessions"
down_revision: Union[str, Sequence[str], None] = "24d61180ed72"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── interview_room_templates ──────────────────────────────────────────────
    op.create_table(
        "interview_room_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("company", sa.String(100), nullable=False, server_default=""),
        sa.Column("role", sa.String(100), nullable=False),
        sa.Column("round_type", sa.String(20), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("interviewer_name", sa.String(100), nullable=False, server_default="Alex"),
        sa.Column("interviewer_persona", sa.Text(), nullable=False, server_default=""),
        sa.Column("competencies", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("rubric_dimensions", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_room_templates_id", "interview_room_templates", ["id"], unique=False)
    op.create_index("ix_room_templates_slug", "interview_room_templates", ["slug"], unique=True)

    # ── interview_sessions ────────────────────────────────────────────────────
    op.create_table(
        "interview_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "room_template_id",
            sa.Integer(),
            sa.ForeignKey("interview_room_templates.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("livekit_room_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_sessions_id", "interview_sessions", ["id"], unique=False)
    op.create_index("ix_sessions_user_id", "interview_sessions", ["user_id"], unique=False)
    op.create_index(
        "ix_sessions_room_template_id", "interview_sessions", ["room_template_id"], unique=False
    )

    # ── interview_turns ───────────────────────────────────────────────────────
    op.create_table(
        "interview_turns",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("turn_number", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("asked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("answer_audio_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("session_id", "turn_number", name="uq_turn_session_number"),
    )
    op.create_index("ix_turns_id", "interview_turns", ["id"], unique=False)
    op.create_index("ix_turns_session_id", "interview_turns", ["session_id"], unique=False)

    # ── feedback_reports ──────────────────────────────────────────────────────
    op.create_table(
        "feedback_reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("dimension_scores", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("strengths", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("weaknesses", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("recommendations", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("raw_ai_response", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_reports_id", "feedback_reports", ["id"], unique=False)
    op.create_index("ix_reports_session_id", "feedback_reports", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_table("feedback_reports")
    op.drop_table("interview_turns")
    op.drop_table("interview_sessions")
    op.drop_table("interview_room_templates")
