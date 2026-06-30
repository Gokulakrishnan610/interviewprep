"""
Deepgram integration — Speech-to-Text transcription.

Accepts raw audio bytes (WAV / WebM / MP4 etc.) and returns a transcript string.

Usage
-----
    client = DeepgramClient()
    result = await client.transcribe_bytes(audio_bytes, mime_type="audio/webm")
    print(result.transcript)
"""
from __future__ import annotations

import base64
import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TranscriptResult:
    transcript: str
    confidence: float = 0.0
    words: list[dict] | None = None   # word-level timing if requested
    source: str = "deepgram"          # "deepgram" | "fallback"


class DeepgramClient:
    """
    Wraps the Deepgram SDK for pre-recorded audio transcription.

    The WS conductor passes base64-encoded audio from the client;
    this client decodes it, calls Deepgram, and returns plain text.
    """

    _DEFAULT_OPTIONS: dict = {
        "model": "nova-2",          # best accuracy/speed ratio
        "smart_format": True,       # punctuation + paragraphs
        "language": "en-US",
        "filler_words": False,
        "utterances": False,
    }

    def __init__(self) -> None:
        self._api_key = settings.DEEPGRAM_API_KEY

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def transcribe_bytes(
        self,
        audio_bytes: bytes,
        *,
        mime_type: str = "audio/webm",
        language: str = "en-US",
    ) -> TranscriptResult:
        """
        Transcribe raw audio bytes.

        Args:
            audio_bytes: Raw audio data (WAV, WebM, MP4, OGG, etc.)
            mime_type:   MIME type of the audio for Deepgram to decode correctly.
            language:    BCP-47 language code.

        Returns:
            TranscriptResult with transcript text and confidence score.
        """
        if not self.is_configured():
            logger.warning("Deepgram API key not configured — returning empty transcript")
            return TranscriptResult(
                transcript="", confidence=0.0, source="fallback"
            )

        try:
            from deepgram import DeepgramClient as _DG, PrerecordedOptions  # type: ignore[import]

            client = _DG(self._api_key)
            options = PrerecordedOptions(
                model=self._DEFAULT_OPTIONS["model"],
                smart_format=self._DEFAULT_OPTIONS["smart_format"],
                language=language,
                filler_words=False,
            )

            payload = {"buffer": audio_bytes, "mimetype": mime_type}
            response = await client.listen.asyncprerecorded.v("1").transcribe_file(
                payload, options
            )

            # Navigate the response safely
            channels = (
                response.results.channels
                if hasattr(response, "results") and response.results
                else []
            )
            if not channels:
                return TranscriptResult(transcript="", source="deepgram")

            alt = channels[0].alternatives[0] if channels[0].alternatives else None
            if not alt:
                return TranscriptResult(transcript="", source="deepgram")

            return TranscriptResult(
                transcript=alt.transcript or "",
                confidence=float(getattr(alt, "confidence", 0.0)),
                words=getattr(alt, "words", None),
                source="deepgram",
            )

        except ImportError:
            logger.warning("deepgram-sdk not installed — returning empty transcript")
            return TranscriptResult(transcript="", source="fallback")
        except Exception as exc:
            logger.error("Deepgram transcription failed: %s", exc)
            return TranscriptResult(transcript="", source="fallback")

    async def transcribe_base64(
        self,
        b64_audio: str,
        *,
        mime_type: str = "audio/webm",
        language: str = "en-US",
    ) -> TranscriptResult:
        """
        Convenience wrapper: accepts base64-encoded audio string (from WebSocket).
        Decodes to bytes then calls transcribe_bytes.
        """
        try:
            audio_bytes = base64.b64decode(b64_audio)
        except Exception as exc:
            logger.error("Failed to decode base64 audio: %s", exc)
            return TranscriptResult(transcript="", source="fallback")

        return await self.transcribe_bytes(audio_bytes, mime_type=mime_type, language=language)
