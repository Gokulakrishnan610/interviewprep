"""
Admin API — protected by is_admin flag on User.

All routes require a valid Bearer token whose user has is_admin=True.

Endpoints
─────────
  POST   /api/admin/rooms/             create a room template
  PATCH  /api/admin/rooms/{id}         partial update a room template
  DELETE /api/admin/rooms/{id}         soft-deactivate a room template
  POST   /api/admin/rooms/seed         bulk-insert the canonical 5 fixture rooms
  GET    /api/admin/users              list all users (id, email, is_admin, is_active)
  PATCH  /api/admin/users/{id}/promote grant admin privileges
  PATCH  /api/admin/users/{id}/demote  revoke admin privileges
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.admin_deps import get_admin_user
from app.core.dependencies import get_db
from app.models.user import User
from app.schemas.rooms import (
    RoomTemplateCreateRequest,
    RoomTemplateDetailResponse,
    RoomTemplateUpdateRequest,
)
from app.services.room_service import RoomService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Dependency factories ──────────────────────────────────────────────────────

def _room_svc(db: AsyncSession = Depends(get_db)) -> RoomService:
    return RoomService(db)


# ── Room CRUD ─────────────────────────────────────────────────────────────────

@router.post(
    "/rooms",
    response_model=RoomTemplateDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a room template",
)
async def create_room(
    payload: RoomTemplateCreateRequest,
    _: User = Depends(get_admin_user),
    svc: RoomService = Depends(_room_svc),
) -> RoomTemplateDetailResponse:
    return await svc.create_room(payload)


@router.patch(
    "/rooms/{room_id}",
    response_model=RoomTemplateDetailResponse,
    summary="Partial update a room template",
)
async def update_room(
    room_id: int,
    payload: RoomTemplateUpdateRequest,
    _: User = Depends(get_admin_user),
    svc: RoomService = Depends(_room_svc),
) -> RoomTemplateDetailResponse:
    return await svc.update_room(room_id, payload)


@router.delete(
    "/rooms/{room_id}",
    response_model=RoomTemplateDetailResponse,
    summary="Soft-deactivate a room template (sets is_active=False)",
)
async def deactivate_room(
    room_id: int,
    _: User = Depends(get_admin_user),
    svc: RoomService = Depends(_room_svc),
) -> RoomTemplateDetailResponse:
    return await svc.deactivate_room(room_id)


@router.post(
    "/rooms/seed",
    summary="Seed the canonical interview room templates",
    description=(
        "Idempotent — skips rooms whose slug already exists. "
        "Loads the 5 canonical rooms: Amazon SDE-1 behavioral, Google frontend, "
        "Deloitte HR, Frontend fundamentals, System design backend."
    ),
)
async def seed_rooms(
    _: User = Depends(get_admin_user),
    svc: RoomService = Depends(_room_svc),
) -> dict:
    result = await svc.seed_rooms(_CANONICAL_ROOMS)
    return {
        "message": f"Seed complete. Inserted: {result['inserted']}, Skipped: {result['skipped']}.",
        **result,
    }


# ── User management ───────────────────────────────────────────────────────────

@router.get(
    "/users",
    summary="List all registered users",
)
async def list_users(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(
            User.id,
            User.email,
            User.first_name,
            User.last_name,
            User.is_active,
            User.is_admin,
            User.is_email_verified,
            User.created_at,
        ).order_by(User.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "email": r.email,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "is_active": r.is_active,
            "is_admin": r.is_admin,
            "is_email_verified": r.is_email_verified,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.patch(
    "/users/{user_id}/promote",
    summary="Grant admin privileges to a user",
)
async def promote_user(
    user_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await _set_admin(db, user_id, is_admin=True)


@router.patch(
    "/users/{user_id}/demote",
    summary="Revoke admin privileges from a user",
)
async def demote_user(
    user_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await _set_admin(db, user_id, is_admin=False)


async def _set_admin(db: AsyncSession, user_id: int, *, is_admin: bool) -> dict:
    from fastapi import HTTPException

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_admin = is_admin
    db.add(user)
    await db.commit()
    return {
        "id": user.id,
        "email": user.email,
        "is_admin": user.is_admin,
        "message": f"User {'promoted to' if is_admin else 'demoted from'} admin.",
    }


# ── Canonical room seed data ──────────────────────────────────────────────────
# Mirrors backend-django/rooms/fixtures/initial_rooms.json exactly.

_CANONICAL_ROOMS: list[dict] = [
    {
        "slug": "amazon-sde1-behavioral",
        "title": "Amazon SDE-1 Behavioral",
        "description": (
            "Practice Amazon Leadership Principles-based behavioral questions "
            "targeted at entry-level software engineering roles. Expect STAR-format "
            "probes on ownership, bias for action, and customer obsession."
        ),
        "company": "Amazon",
        "role": "SDE-1",
        "round_type": "behavioral",
        "difficulty": "intermediate",
        "duration_minutes": 30,
        "interviewer_name": "Sarah",
        "interviewer_persona": (
            "You are Sarah, a seasoned Amazon engineering manager. You conduct "
            "structured behavioral interviews focused strictly on Amazon Leadership "
            "Principles. You ask one question at a time, probe for specific examples "
            "using STAR follow-ups, and maintain a professional but warm tone. You do "
            "not accept vague or hypothetical answers — you always redirect to real "
            "past experiences."
        ),
        "competencies": [
            "ownership", "customer_obsession", "bias_for_action",
            "dive_deep", "deliver_results",
        ],
        "rubric_dimensions": [
            {"dimension": "clarity",    "description": "Was the situation clearly explained?",              "max_score": 10},
            {"dimension": "structure",  "description": "Did the answer follow a coherent STAR structure?",  "max_score": 10},
            {"dimension": "ownership",  "description": "Did the candidate demonstrate personal accountability?", "max_score": 10},
            {"dimension": "impact",     "description": "Was the outcome measurable and significant?",       "max_score": 10},
            {"dimension": "confidence", "description": "Was the delivery confident and assertive?",         "max_score": 10},
        ],
        "is_active": True,
    },
    {
        "slug": "google-frontend-screening",
        "title": "Google Frontend Screening",
        "description": (
            "A frontend-focused technical screening covering JavaScript internals, "
            "browser APIs, React patterns, performance, and accessibility. Expect "
            "conceptual questions and code reasoning."
        ),
        "company": "Google",
        "role": "Frontend Engineer",
        "round_type": "technical",
        "difficulty": "intermediate",
        "duration_minutes": 45,
        "interviewer_name": "Priya",
        "interviewer_persona": (
            "You are Priya, a Google frontend engineer conducting a technical phone "
            "screen. You ask precise technical questions about JavaScript, React, and "
            "browser fundamentals. You follow up shallow answers with deeper probes. "
            "You are direct, intellectually curious, and appreciate candidates who "
            "think aloud and acknowledge what they do not know."
        ),
        "competencies": [
            "javascript_fundamentals", "react_patterns", "browser_apis",
            "performance_optimization", "accessibility",
        ],
        "rubric_dimensions": [
            {"dimension": "correctness",       "description": "Was the technical answer accurate?",                "max_score": 10},
            {"dimension": "reasoning",         "description": "Did the candidate explain their thought process?",  "max_score": 10},
            {"dimension": "communication",     "description": "Was the explanation clear and structured?",         "max_score": 10},
            {"dimension": "tradeoff_awareness","description": "Did the candidate discuss pros and cons?",          "max_score": 10},
            {"dimension": "problem_solving",   "description": "Did the candidate approach unknowns methodically?", "max_score": 10},
        ],
        "is_active": True,
    },
    {
        "slug": "deloitte-hr-round",
        "title": "Deloitte HR Round",
        "description": (
            "Simulate a Deloitte HR round covering motivation, cultural fit, career "
            "goals, teamwork, and conflict resolution. Suitable for both campus and "
            "lateral hiring."
        ),
        "company": "Deloitte",
        "role": "Consultant",
        "round_type": "hr",
        "difficulty": "beginner",
        "duration_minutes": 30,
        "interviewer_name": "James",
        "interviewer_persona": (
            "You are James, an HR representative at Deloitte conducting a standard "
            "HR round. You ask warm, open-ended questions about the candidate's "
            "background, motivation for joining, strengths and weaknesses, and "
            "teamwork experiences. You are friendly and conversational, but probe "
            "further when answers are generic. You value authenticity and "
            "self-awareness."
        ),
        "competencies": [
            "motivation", "cultural_fit", "teamwork",
            "conflict_resolution", "self_awareness",
        ],
        "rubric_dimensions": [
            {"dimension": "clarity",    "description": "Was the answer clearly articulated?",    "max_score": 10},
            {"dimension": "structure",  "description": "Was the response well-organised?",       "max_score": 10},
            {"dimension": "ownership",  "description": "Did the candidate show accountability?", "max_score": 10},
            {"dimension": "impact",     "description": "Were concrete examples used?",           "max_score": 10},
            {"dimension": "confidence", "description": "Was the candidate composed and confident?", "max_score": 10},
        ],
        "is_active": True,
    },
    {
        "slug": "frontend-technical-fundamentals",
        "title": "Frontend Developer Technical Fundamentals",
        "description": (
            "A general-purpose technical interview for frontend roles covering HTML, "
            "CSS, JavaScript, and React. No specific company. Ideal for entry to "
            "mid-level candidates."
        ),
        "company": "",
        "role": "Frontend Developer",
        "round_type": "technical",
        "difficulty": "beginner",
        "duration_minutes": 30,
        "interviewer_name": "Alex",
        "interviewer_persona": (
            "You are Alex, a neutral technical interviewer assessing core frontend "
            "knowledge. You ask clear, structured questions about HTML semantics, CSS "
            "layout, JavaScript fundamentals, and React basics. You give candidates "
            "time to think and provide gentle hints if they are completely stuck. "
            "Your tone is encouraging but thorough."
        ),
        "competencies": [
            "html_semantics", "css_layout", "javascript_core",
            "react_basics", "debugging",
        ],
        "rubric_dimensions": [
            {"dimension": "correctness",       "description": "Was the technical answer accurate?",                "max_score": 10},
            {"dimension": "reasoning",         "description": "Did the candidate explain their thought process?",  "max_score": 10},
            {"dimension": "communication",     "description": "Was the explanation clear and structured?",         "max_score": 10},
            {"dimension": "tradeoff_awareness","description": "Did the candidate discuss pros and cons?",          "max_score": 10},
            {"dimension": "problem_solving",   "description": "Did the candidate approach unknowns methodically?", "max_score": 10},
        ],
        "is_active": True,
    },
    {
        "slug": "system-design-backend",
        "title": "System Design — Backend Room",
        "description": (
            "Practice backend system design questions: scalable APIs, databases, "
            "caching, queues, and distributed systems. Targeted at mid to senior "
            "backend engineers."
        ),
        "company": "",
        "role": "Backend Engineer",
        "round_type": "system_design",
        "difficulty": "advanced",
        "duration_minutes": 60,
        "interviewer_name": "Morgan",
        "interviewer_persona": (
            "You are Morgan, a principal engineer conducting a system design "
            "interview. You present open-ended design problems and guide the "
            "candidate through clarifying requirements, high-level architecture, "
            "component design, data modeling, and scalability. You probe hard on "
            "trade-offs and ask the candidate to justify every major decision. "
            "You reward structured thinking over perfect answers."
        ),
        "competencies": [
            "requirement_clarification", "high_level_design", "data_modeling",
            "scalability", "tradeoff_analysis",
        ],
        "rubric_dimensions": [
            {"dimension": "requirement_clarity",  "description": "Did the candidate clarify scope and constraints?",        "max_score": 10},
            {"dimension": "architecture_quality", "description": "Was the proposed architecture sound and justified?",       "max_score": 10},
            {"dimension": "tradeoffs",            "description": "Were design trade-offs explicitly discussed?",             "max_score": 10},
            {"dimension": "scalability",          "description": "Did the design account for scale and failure modes?",      "max_score": 10},
            {"dimension": "communication",        "description": "Was the design explained clearly and incrementally?",      "max_score": 10},
        ],
        "is_active": True,
    },
]
