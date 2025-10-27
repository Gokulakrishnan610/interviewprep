import google.cloud.texttospeech as tts
from deepgram import Deepgram
from app.core.config import settings
import aiohttp
import os
from gtts import gTTS
import io

class AudioService:
    def __init__(self):
        # Initialize Deepgram if API key is available
        try:
            if settings.DEEPGRAM_API_KEY and settings.DEEPGRAM_API_KEY != "your-deepgram-api-key":
                self.deepgram = Deepgram(settings.DEEPGRAM_API_KEY)
            else:
                self.deepgram = None
                print("Deepgram API key not configured")
        except Exception as e:
            self.deepgram = None
            print(f"Failed to initialize Deepgram: {e}")
            
        # Try to initialize Google Cloud TTS, fallback to gTTS if credentials not available
        try:
            self.tts_client = tts.TextToSpeechClient()
            self.use_cloud_tts = True
        except Exception as e:
            print(f"Google Cloud TTS not available, using gTTS: {e}")
            self.tts_client = None
            self.use_cloud_tts = False

    async def transcribe_audio(self, audio_url: str, language_code: str = "en-US"):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as response:
                    audio_data = await response.read()
                    
            source = {"buffer": audio_data, "mimetype": "audio/wav"}
            response = await self.deepgram.transcription.prerecorded(
                source,
                {
                    "smart_format": True,
                    "model": "enhanced",
                    "language": language_code
                }
            )
            
            return response["results"]["channels"][0]["alternatives"][0]["transcript"]
        except Exception as e:
            raise Exception(f"Transcription failed: {str(e)}")

    async def text_to_speech(self, text: str, voice_name: str, language_code: str):
        try:
            if self.use_cloud_tts:
                synthesis_input = tts.SynthesisInput(text=text)
                voice = tts.VoiceSelectionParams(
                    language_code=language_code,
                    name=voice_name
                )
                audio_config = tts.AudioConfig(
                    audio_encoding=tts.AudioEncoding.MP3
                )

                response = self.tts_client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config
                )

                return response.audio_content
            else:
                # Use gTTS as fallback
                tts_obj = gTTS(text=text, lang=language_code.split('-')[0], slow=False)
                audio_buffer = io.BytesIO()
                tts_obj.write_to_fp(audio_buffer)
                audio_buffer.seek(0)
                return audio_buffer.getvalue()
        except Exception as e:
            raise Exception(f"Text-to-speech failed: {str(e)}")

    async def process_audio(self, file):
        # Implement audio processing logic
        pass

    async def enhance_audio(self, audio_url: str, settings: dict = None):
        # Implement audio enhancement logic
        pass

    async def convert_audio(self, file, format: str, sample_rate: int):
        # Implement audio conversion logic
        pass