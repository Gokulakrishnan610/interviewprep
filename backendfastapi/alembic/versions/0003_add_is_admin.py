"""add is_admin to users

Revision ID: 0003_add_is_admin
Revises: 0002_rooms_and_sessions
Create Date: 2025-06-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_is_admin"
down_revision: Union[str, Sequence[str], None] = "0002_rooms_and_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
