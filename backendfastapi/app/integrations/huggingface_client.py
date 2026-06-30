"""
Hugging Face Inference API integration — zero-shot answer classifier.

Used as a lightweight secondary signal alongside Gemini scoring:
classifies a candidate's answer against a set of competency labels
without any fine-tuning.

Model: facebook/bart-large-mnli (configurable via HF_ZERO_SHOT_MODEL)

Usage
-----
    client = HuggingFaceClient()
    result = await client.classify_answer(
        text="I led the migration of our monolith to microservices...",
        candidate_labels=["ownership", "technical depth", "communication"],
    )
    # result.scores == {"ownership": 0.82, "technical depth": 0.71, ...}
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    label: str                          # top label
    score: float                        # confidence of top label (0–1)
    scores: dict[str, float] = field(default_factory=dict)  # all label → score
    source: str = "huggingface"


class HuggingFaceClient:
    """
    Calls the HuggingFace Inference API for zero-shot text classification.

    No local model download — uses the hosted API endpoint.
    Rate-limited on the free tier; configure a paid token for production.
    """

    def __init__(self) -> None:
        self._api_key = settings.HUGGING_FACE_API_KEY
        self._model = settings.HF_ZERO_SHOT_MODEL
        self._base_url = settings.HF_API_BASE_URL

    def is_configured(self) -> bool:
        return bool(self._api_key)

    @property
    def _endpoint(self) -> str:
        return f"{self._base_url.rstrip('/')}/{self._model}"

    async def classify_answer(
        self,
        text: str,
        candidate_labels: list[str],
        *,
        multi_label: bool = True,
    ) -> ClassificationResult:
        """
        Zero-shot classify the answer text against the given labels.

        Args:
            text:             Candidate's answer text.
            candidate_labels: Competency or category names to score against.
            multi_label:      Allow multiple labels to score high simultaneously
                              (True = appropriate for competency scoring).

        Returns:
            ClassificationResult with top label and full scores dict.
        """
        if not self.is_configured():
            logger.warning("HuggingFace API key not configured — skipping classification")
            return self._empty_result(candidate_labels)

        if not candidate_labels:
            return self._empty_result([])

        try:
            import httpx

            headers = {"Authorization": f"Bearer {self._api_key}"}
            payload = {
                "inputs": text[:1024],  # API limit
                "parameters": {
                    "candidate_labels": candidate_labels,
                    "multi_label": multi_label,
                },
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(self._endpoint, json=payload, headers=headers)

            if resp.status_code == 503:
                # Model loading — transient, not a hard error
                logger.info("HuggingFace model loading (503) — skipping this call")
                return self._empty_result(candidate_labels)

            if resp.status_code != 200:
                logger.warning(
                    "HuggingFace API %s: %s", resp.status_code, resp.text[:200]
                )
                return self._empty_result(candidate_labels)

            data = resp.json()
            labels: list[str] = data.get("labels", [])
            raw_scores: list[float] = data.get("scores", [])

            scores = dict(zip(labels, raw_scores))
            top_label = labels[0] if labels else ""
            top_score = raw_scores[0] if raw_scores else 0.0

            return ClassificationResult(
                label=top_label,
                score=top_score,
                scores=scores,
                source="huggingface",
            )

        except ImportError:
            logger.warning("httpx not installed — HuggingFace client unavailable")
            return self._empty_result(candidate_labels)
        except Exception as exc:
            logger.error("HuggingFace classification failed: %s", exc)
            return self._empty_result(candidate_labels)

    @staticmethod
    def _empty_result(labels: list[str]) -> ClassificationResult:
        return ClassificationResult(
            label="",
            score=0.0,
            scores={lbl: 0.0 for lbl in labels},
            source="fallback",
        )
