# Import all models here so that:
#   1. Alembic autogenerate discovers every table via Base.metadata
#   2. SQLAlchemy relationship resolution works across model files

from app.models.user import User, UserProfile  # noqa: F401

# Phase 3+:
# from app.models.room import InterviewRoomTemplate        # noqa: F401
# from app.models.session import InterviewSession, ...     # noqa: F401
