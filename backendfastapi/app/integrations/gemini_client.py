"""
Google Gemini integration.

Two responsibilities:
  1. generate_question  — ask Gemini to produce the next interview question
                          given the room template context and conversation history.
  2. generate_feedback  — analyse all turns and return a structured scorecard
                          matching the room template's rubric_dimensions.

All prompt engineering lives here.  The WS conductor and report service
call these methods without knowing anything about Gemini.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Response dataclasses ──────────────────────────────────────────────────────


@dataclass
class QuestionResult:
    question_text: str
    source: str = "gemini"   # "gemini" | "fallback"


@dataclass
class FeedbackResult:
    overall_score: float
    dimension_scores: dict[str, float]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    raw_response: str = ""


# ── Client ────────────────────────────────────────────────────────────────────


class GeminiClient:
    """
    Wraps google-generativeai for interview question generation and
    post-interview feedback scoring.
    """

    _MODEL_NAME = "gemini-1.5-flash"          # fast, cost-efficient
    _FEEDBACK_MODEL_NAME = "gemini-1.5-pro"   # stronger for structured analysis

    def __init__(self) -> None:
        self._api_key = settings.GOOGLE_API_KEY
        self._model = None
        self._feedback_model = None

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _get_model(self, model_name: str):
        """Lazy-initialise the generative model on first use."""
        try:
            import google.generativeai as genai  # type: ignore[import]

            genai.configure(api_key=self._api_key)
            return genai.GenerativeModel(
                model_name,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 512,
                    "top_p": 0.9,
                },
            )
        except ImportError:
            logger.warning("google-generativeai package not installed")
            return None
        except Exception as exc:
            logger.error("Gemini model init failed: %s", exc)
            return None

    # ── Question generation ───────────────────────────────────────────────────

    async def generate_question(
        self,
        *,
        turn_number: int,
        room_title: str,
        interviewer_name: str,
        interviewer_persona: str,
        round_type: str,
        competencies: list[str],
        prior_turns: list[dict],  # [{"turn": int, "question": str, "answer": str}]
    ) -> QuestionResult:
        """
        Generate the next interview question using Gemini.

        `prior_turns` provides full conversation context so questions
        are coherent and don't repeat competencies already explored.
        Falls back to a deterministic placeholder if Gemini is unavailable.
        """
        if not self.is_configured():
            return self._fallback_question(turn_number, interviewer_name, competencies)

        model = self._get_model(self._MODEL_NAME)
        if model is None:
            return self._fallback_question(turn_number, interviewer_name, competencies)

        prompt = self._build_question_prompt(
            turn_number=turn_number,
            room_title=room_title,
            interviewer_name=interviewer_name,
            interviewer_persona=interviewer_persona,
            round_type=round_type,
            competencies=competencies,
            prior_turns=prior_turns,
        )

        try:
            response = await model.generate_content_async(prompt)
            text = response.text.strip() if hasattr(response, "text") else ""
            if not text:
                raise ValueError("Empty response from Gemini")
            return QuestionResult(question_text=text, source="gemini")
        except Exception as exc:
            logger.warning("Gemini question generation failed: %s — using fallback", exc)
            return self._fallback_question(turn_number, interviewer_name, competencies)

    def _build_question_prompt(
        self,
        *,
        turn_number: int,
        room_title: str,
        interviewer_name: str,
        interviewer_persona: str,
        round_type: str,
        competencies: list[str],
        prior_turns: list[dict],
    ) -> str:
        competency_list = ", ".join(competencies) if competencies else "general professional skills"

        history_block = ""
        if prior_turns:
            lines = []
            for t in prior_turns:
                lines.append(f"Q{t['turn']}: {t['question']}")
                if t.get("answer"):
                    lines.append(f"A{t['turn']}: {t['answer'][:300]}")  # truncate long answers
            history_block = "\n\nConversation so far:\n" + "\n".join(lines)

        if turn_number == 0:
            instruction = (
                "Ask an opening question that warmly introduces you and invites "
                "the candidate to briefly describe their background. Keep it to 1-2 sentences."
            )
        else:
            instruction = (
                f"Ask the next interview question (question {turn_number + 1}). "
                f"Focus on one of these competencies: {competency_list}. "
                "Do not repeat a competency already deeply explored. "
                "Ask only ONE question. Be concise (1-3 sentences). "
                "Do not include any preamble like 'Question:' or numbering."
            )

        return (
            f"You are {interviewer_name}, conducting a {round_type} interview "
            f"for '{room_title}'.\n\n"
            f"Your persona: {interviewer_persona}\n"
            f"Competencies to assess: {competency_list}"
            f"{history_block}\n\n"
            f"{instruction}"
        )

    @staticmethod
    def _fallback_question(
        turn_number: int, interviewer_name: str, competencies: list[str]
    ) -> QuestionResult:
        if turn_number == 0:
            text = (
                f"Hi, I'm {interviewer_name}. "
                "Could you start by briefly introducing yourself and your background?"
            )
        elif competencies:
            c = competencies[(turn_number - 1) % len(competencies)].replace("_", " ")
            text = (
                f"Could you walk me through a specific example that demonstrates "
                f"your approach to {c}?"
            )
        else:
            text = (
                f"Tell me about a challenging situation you encountered and "
                f"how you handled it. (Question {turn_number + 1})"
            )
        return QuestionResult(question_text=text, source="fallback")

    # ── Feedback generation ───────────────────────────────────────────────────

    async def generate_feedback(
        self,
        *,
        room_title: str,
        interviewer_persona: str,
        round_type: str,
        rubric_dimensions: list[dict],  # [{"dimension": str, "description": str, "max_score": int}]
        turns: list[dict],              # [{"turn": int, "question": str, "answer": str}]
    ) -> FeedbackResult:
        """
        Analyse all interview turns and produce a structured feedback report.

        Returns a FeedbackResult with per-dimension scores, strengths,
        weaknesses, and recommendations.
        Falls back to zero-score placeholder on any failure.
        """
        if not self.is_configured():
            return self._empty_feedback(rubric_dimensions, reason="Gemini not configured")

        model = self._get_model(self._FEEDBACK_MODEL_NAME)
        if model is None:
            return self._empty_feedback(rubric_dimensions, reason="Gemini SDK unavailable")

        prompt = self._build_feedback_prompt(
            room_title=room_title,
            interviewer_persona=interviewer_persona,
            round_type=round_type,
            rubric_dimensions=rubric_dimensions,
            turns=turns,
        )

        try:
            response = await model.generate_content_async(prompt)
            raw = response.text.strip() if hasattr(response, "text") else ""
            return self._parse_feedback_response(raw, rubric_dimensions)
        except Exception as exc:
            logger.error("Gemini feedback generation failed: %s", exc)
            return self._empty_feedback(
                rubric_dimensions, reason=f"Generation error: {exc}"
            )

    def _build_feedback_prompt(
        self,
        *,
        room_title: str,
        interviewer_persona: str,
        round_type: str,
        rubric_dimensions: list[dict],
        turns: list[dict],
    ) -> str:
        dim_block = "\n".join(
            f"- {d['dimension']} (max {d.get('max_score', 10)}): {d.get('description', '')}"
            for d in rubric_dimensions
        )
        turn_block = "\n\n".join(
            f"Q{t['turn']}: {t['question']}\nA{t['turn']}: {t.get('answer', '(no answer)')}"
            for t in turns
        )
        dimension_names = [d["dimension"] for d in rubric_dimensions]

        return f"""You are an expert interview evaluator assessing a candidate's performance in a {round_type} interview for '{room_title}'.

Rubric dimensions to score:
{dim_block}

Interview transcript:
{turn_block}

Please provide your evaluation as a valid JSON object with EXACTLY this structure:
{{
  "overall_score": <float 0-10>,
  "dimension_scores": {{{", ".join(f'"{d}": <float 0-10>' for d in dimension_names)}}},
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "recommendations": ["<string>", ...]
}}

Be specific and constructive. Strengths, weaknesses, and recommendations should each have 2-4 items.
Respond with ONLY the JSON object — no markdown, no explanation."""

    def _parse_feedback_response(
        self, raw: str, rubric_dimensions: list[dict]
    ) -> FeedbackResult:
        """Parse Gemini's JSON response into a FeedbackResult. Robust to minor formatting issues."""
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(
                l for l in lines if not l.startswith("```")
            ).strip()

        try:
            data = json.loads(text)
            return FeedbackResult(
                overall_score=float(data.get("overall_score", 0)),
                dimension_scores={
                    k: float(v)
                    for k, v in data.get("dimension_scores", {}).items()
                },
                strengths=list(data.get("strengths", [])),
                weaknesses=list(data.get("weaknesses", [])),
                recommendations=list(data.get("recommendations", [])),
                raw_response=raw,
            )
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.warning("Failed to parse Gemini feedback JSON: %s", exc)
            return self._empty_feedback(rubric_dimensions, reason=raw)

    @staticmethod
    def _empty_feedback(
        rubric_dimensions: list[dict], reason: str = ""
    ) -> FeedbackResult:
        dim_names = [d["dimension"] for d in rubric_dimensions]
        return FeedbackResult(
            overall_score=0.0,
            dimension_scores={d: 0.0 for d in dim_names},
            strengths=[],
            weaknesses=[],
            recommendations=["Feedback generation was unavailable. Please try again."],
            raw_response=reason,
        )
