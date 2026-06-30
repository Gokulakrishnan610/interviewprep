from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect, text

from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_existing_sqlite_columns()

def _ensure_existing_sqlite_columns():
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return

    required_columns = {
        "interviews": {
            "title": "VARCHAR DEFAULT 'Mock Interview'",
            "room_token": "VARCHAR",
            "room_name": "VARCHAR",
            "avatar_id": "VARCHAR DEFAULT '694c83e2-8895-4a98-bd16-56332ca3f449'",
            "interview_type": "VARCHAR DEFAULT 'technical'",
            "difficulty_level": "VARCHAR DEFAULT 'beginner'",
            "duration_minutes": "INTEGER DEFAULT 30",
            "scheduled_time": "DATETIME",
            "score": "FLOAT",
        },
        "interview_analytics": {
            "strengths": "TEXT",
        },
    }

    with engine.begin() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        for table_name, columns in required_columns.items():
            if table_name not in table_names:
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_definition in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")
                    )

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
