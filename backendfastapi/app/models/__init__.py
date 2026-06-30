# Import all models here so that:
#   1. Alembic autogenerate discovers every table via Base.metadata
#   2. SQLAlchemy relationship string-refs resolve at mapper config time
#
# Import ORDER matters: parent tables before child tables.

from app.models.user import User, UserProfile  # noqa: F401
from app.models.room import InterviewRoomTemplate  # noqa: F401
from app.models.session import (  # noqa: F401
    InterviewSession,
    InterviewTurn,
    FeedbackReport,
)
