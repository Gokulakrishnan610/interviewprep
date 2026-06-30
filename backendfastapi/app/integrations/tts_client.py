"""
Text-to-Speech integration — Azure Cognitive Services (primary).

Converts question text to MP3 audio bytes for delivery to the client.
The client can play the audio directly or hand it off to the avatar layer.

Usage
-----
    client = AzureTTSClient()
    result = await client.synthesize("Hello, welcome to your interview.")
    # result.audio_bytes is MP3 data; result.duration_ms is approximate length
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

from app.core.config import settings

logger = logging.getLogger(__name__)

AudioFormat = Literal["mp3", "wav", "ogg"]


@dataclass
class TTSResult:
    audio_bytes: bytes
    audio_format: AudioFormat
    duration_ms: int = 0      # approximate, 0 if unknown
    source: str = "azure"     # "azure" | "fallback"


class AzureTTSClient:
    """
    Wraps the Azure Cognitive Services Speech SDK for TTS.

    Azure SDK (`azure-cognitiveservices-speech`) is a native extension;
    we use the REST API endpoint instead to stay pure-Python and async-friendly.
    """

    # Azure Speech REST endpoint template
    _TOKEN_URL = "https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    _SYNTH_URL = "https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    # SSML template — clean, no prosody overrides; easy to extend
    _SSML_TEMPLATE = (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}">'
        '<voice name="{voice}">{text}</voice>'
        "</speak>"
    )

    def __init__(self) -> None:
        self._key = settings.AZURE_SPEECH_KEY
        self._region = settings.AZURE_SPEECH_REGION
        self._voice = settings.AZURE_TTS_VOICE
        # Infer language from voice name (e.g. "en-US-JennyNeural" → "en-US")
        self._lang = "-".join(self._voice.split("-")[:2]) if self._voice else "en-US"

    def is_configured(self) -> bool:
        return bool(self._key and self._region)

    async def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        audio_format: AudioFormat = "mp3",
    ) -> TTSResult:
        """
        Convert text to speech and return audio bytes.

        Args:
            text:         Plain text to synthesise (HTML-escaped internally).
            voice:        Override the configured Azure voice name.
            audio_format: Output audio format.

        Returns:
            TTSResult with audio_bytes ready to send or save.
        """
        if not self.is_configured():
            logger.warning("Azure TTS not configured — returning silent placeholder")
            return TTSResult(audio_bytes=b"", audio_format=audio_format, source="fallback")

        effective_voice = voice or self._voice
        ssml = self._SSML_TEMPLATE.format(
            lang=self._lang,
            voice=effective_voice,
            text=self._escape_xml(text),
        )

        output_format_header = self._format_header(audio_format)

        try:
            import httpx  # already in requirements

            headers = {
                "Ocp-Apim-Subscription-Key": self._key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": output_format_header,
                "User-Agent": "InterviewPrepAI/2.0",
            }
            url = self._SYNTH_URL.format(region=self._region)

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, content=ssml.encode("utf-8"), headers=headers)

            if resp.status_code != 200:
                logger.error(
                    "Azure TTS HTTP %s: %s", resp.status_code, resp.text[:200]
                )
                return TTSResult(audio_bytes=b"", audio_format=audio_format, source="fallback")

            return TTSResult(
                audio_bytes=resp.content,
                audio_format=audio_format,
                source="azure",
            )

        except ImportError:
            logger.warning("httpx not installed — TTS unavailable")
            return TTSResult(audio_bytes=b"", audio_format=audio_format, source="fallback")
        except Exception as exc:
            logger.error("Azure TTS synthesis failed: %s", exc)
            return TTSResult(audio_bytes=b"", audio_format=audio_format, source="fallback")

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _escape_xml(text: str) -> str:
        """Minimal XML escaping so SSML stays valid."""
        return (
            text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

    @staticmethod
    def _format_header(fmt: AudioFormat) -> str:
        return {
            "mp3": "audio-16khz-128kbitrate-mono-mp3",
            "wav": "riff-16khz-16bit-mono-pcm",
            "ogg": "ogg-16khz-16bit-mono-opus",
        }.get(fmt, "audio-16khz-128kbitrate-mono-mp3")
