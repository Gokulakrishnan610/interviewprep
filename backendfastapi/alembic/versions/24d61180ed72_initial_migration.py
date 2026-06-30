"""Initial migration — users and user_profiles
Revision ID: 24d61180ed72
Revises:
Create Date: 2025-06-30
Replaces the legacy initial migration (avatar_sessions, interviews, etc.)
with the Phase 1+2 canonical schema: users and user_profiles.
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
revision: str = "24d61180ed72"
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None
def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("profile_picture", sa.String(500), nullable=True),
        sa.Column(
            "avatar_id",
            sa.String(100),
            nullable=False,
            server_default="694c83e2-8895-4a98-bd16-56332ca3f449",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    # ── user_profiles ─────────────────────────────────────────────────────────
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("preferred_language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("interview_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skill_level", sa.String(20), nullable=False, server_default="beginner"),
    )
    op.create_index("ix_user_profiles_id", "user_profiles", ["id"], unique=False)


def downgrade() -> None:
    op.drop_table("user_profiles")
    op.drop_table("users")