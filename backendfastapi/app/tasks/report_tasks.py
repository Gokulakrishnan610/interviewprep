"""
report_tasks.py — background task for post-interview report generation.

Entry point: generate_report_task(session_id)

Pipeline
────────
  1. Load session + turns from Postgres (fresh DB session)
  2. Build turn transcript dicts
  3. Call GeminiClient.generate_feedback() → FeedbackResult
  4. Optionally enrich per-turn classification via HuggingFaceClient
     (only if configured; never blocks the report on HF failure)
  5. Persist FeedbackReport to DB
  6. Update a Redis status key so the frontend can poll progress

Redis status key
────────────────
  report_status:{session_id}  →  Hash
    status   "pending" | "running" | "done" | "failed"
    error    str  (populated on failure)
    ttl      3 hours after last write

This module is imported by:
  - InterviewOrchestrator.on_end_session()  (WS path)
  - SessionService.complete_session()       (REST path)
  - ReportService.trigger_report()          (manual re-trigger endpoint)
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.integrations.gemini_client import FeedbackResult, GeminiClient
from app.integrations.huggingface_client import HuggingFaceClient

logger = logging.getLogger(__name__)

_REPORT_STATUS_TTL = 60 * 60 * 3  # 3 hours
_STATUS_KEY_PREFIX = "report_status"


# ── Redis helpers ─────────────────────────────────────────────────────────────

def _status_key(session_id: int) -> str:
    return f"{_STATUS_KEY_PREFIX}:{session_id}"


async def _set_status(redis, session_id: int, status: str, error: str = "") -> None:
    key = _status_key(session_id)
    await redis.hset(key, mapping={"status": status, "error": error})
    await redis.expire(key, _REPORT_STATUS_TTL)


async def get_report_status(redis, session_id: int) -> dict:
    """Return the current generation status dict for a session."""
    raw = await redis.hgetall(_status_key(session_id))
    if not raw:
        return {"status": "unknown", "error": ""}
    return {"status": raw.get("status", "unknown"), "error": raw.get("error", "")}


# ── HF enrichment ─────────────────────────────────────────────────────────────

async def _enrich_with_hf(
    turns: list[dict],
    competencies: list[str],
) -> dict[str, float]:
    """
    Run each answered turn through HuggingFace zero-shot classifier and
    return averaged per-competency scores across all turns.

    Returns an empty dict if HF is not configured or any call fails —
    the calling code should treat this as a non-blocking enrichment.
    """
    if not competencies:
        return {}

    hf = HuggingFaceClient()
    if not hf.is_configured():
        logger.debug("HF not configured — skipping enrichment")
        return {}

    answered_turns = [t for t in turns if t.get("answer", "").strip()]
    if not answered_turns:
        return {}

    # Aggregate scores per competency across all turns
    totals: dict[str, float] = {c: 0.0 for c in competencies}
    count = 0

    for turn in answered_turns:
        answer_text = turn["answer"][:1024]
        try:
            result = await hf.classify_answer(
                text=answer_text,
                candidate_labels=competencies,
                multi_label=True,
            )
            if result.source == "huggingface":
                for comp in competencies:
                    totals[comp] += result.scores.get(comp, 0.0)
                count += 1
        except Exception as exc:
            logger.warning("HF enrichment failed for turn %s: %s", turn.get("turn"), exc)

    if count == 0:
        return {}

    return {c: round(totals[c] / count, 4) for c in competencies}


# ── Core task ─────────────────────────────────────────────────────────────────

async def generate_report_task(session_id: int) -> None:
    """
    Standalone async task — runs in an asyncio.Task (fire-and-forget).

    Opens its own DB and Redis connections so it is fully independent of
    the request or WebSocket session that triggered it.
    """
    # Late imports to avoid circular deps at module load time
    from app.core.database import AsyncSessionLocal
    from app.core.redis import get_redis_pool
    from app.repositories.session_repository import SessionRepository

    redis = get_redis_pool()

    # ── Guard: already running / done ─────────────────────────────────────────
    existing = await get_report_status(redis, session_id)
    if existing["status"] in ("running", "done"):
        logger.info(
            "Report task skipped for session %s — already %s",
            session_id, existing["status"],
        )
        return

    await _set_status(redis, session_id, "running")
    logger.info("Report generation started for session %s", session_id)

    try:
        async with AsyncSessionLocal() as db:
            repo = SessionRepository(db)

            # ── Load session ──────────────────────────────────────────────────
            session = await repo.get_by_id(session_id)
            if session is None:
                raise ValueError(f"Session {session_id} not found")

            if session.report is not None:
                logger.info("Report already exists for session %s — skipping", session_id)
                await _set_status(redis, session_id, "done")
                return

            if session.status != "completed":
                raise ValueError(
                    f"Session {session_id} is not completed (status={session.status})"
                )

            # ── Build transcript ──────────────────────────────────────────────
            turns_orm = await repo.get_turns_for_session(session_id)
            turn_dicts = [
                {
                    "turn": t.turn_number,
                    "question": t.question_text,
                    "answer": t.answer_text or "(no answer)",
                }
                for t in turns_orm
            ]

            room = session.room_template

            # ── Gemini feedback ───────────────────────────────────────────────
            gemini = GeminiClient()
            feedback: FeedbackResult = await gemini.generate_feedback(
                room_title=room.title,
                interviewer_persona=room.interviewer_persona or "",
                round_type=room.round_type,
                rubric_dimensions=room.rubric_dimensions or [],
                turns=turn_dicts,
            )

            # ── HF enrichment (optional, non-blocking) ────────────────────────
            hf_scores = await _enrich_with_hf(
                turns=turn_dicts,
                competencies=room.competencies or [],
            )

            # Merge HF signal into dimension_scores as supplementary sub-key
            # Format: {"clarity": 8.0, ..., "hf_competency_scores": {"ownership": 0.82}}
            dimension_scores = dict(feedback.dimension_scores)
            if hf_scores:
                dimension_scores["hf_competency_scores"] = hf_scores

            # ── Persist report ────────────────────────────────────────────────
            await repo.create_report(
                session_id=session_id,
                overall_score=feedback.overall_score,
                dimension_scores=dimension_scores,
                strengths=feedback.strengths,
                weaknesses=feedback.weaknesses,
                recommendations=feedback.recommendations,
                raw_ai_response=feedback.raw_response,
            )
            await repo.commit()

            await _set_status(redis, session_id, "done")
            logger.info(
                "Report generated for session %s — overall_score=%.1f hf=%s",
                session_id,
                feedback.overall_score,
                bool(hf_scores),
            )

    except Exception as exc:
        error_str = str(exc)[:500]
        logger.exception("Report generation failed for session %s: %s", session_id, exc)
        await _set_status(redis, session_id, "failed", error=error_str)


def schedule_report(session_id: int) -> asyncio.Task:
    """
    Fire-and-forget wrapper.
    Returns the Task so callers can optionally await or cancel it.
    """
    return asyncio.create_task(
        generate_report_task(session_id),
        name=f"report-{session_id}",
    )
