"""
LiveKit Practice Agent with Gemini 2.5 Flash, Deepgram, and ElevenLabs
"""

import argparse
import os
import sys
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import bey, deepgram, elevenlabs

# Import for Gemini (we'll use custom implementation since no direct plugin)
import google.generativeai as genai


class GeminiLLM:
    """Custom LLM wrapper for Gemini 2.5 Flash"""
    
    def __init__(self, model_name: str = "gemini-2.0-flash", temperature: float = 0.8):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.temperature = temperature
        self.conversation_history = []
        
        print(f"✅ Gemini {model_name} initialized")
    
    async def generate(self, prompt: str) -> str:
        """Generate response using Gemini"""
        try:
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": prompt})
            
            # Build full context
            context = "\n".join([
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                for msg in self.conversation_history
            ])
            
            # Generate response
            response = self.model.generate_content(context)
            response_text = response.text
            
            # Add to history
            self.conversation_history.append({"role": "assistant", "content": response_text})
            
            return response_text
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            return "I apologize, I'm having trouble responding right now."


async def entrypoint(ctx: JobContext) -> None:
    """Main entrypoint for the LiveKit agent"""
    
    print("🚀 Starting Practice Mode Agent...")
    print(f"   Room: {ctx.room.name}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Initialize Gemini LLM
    gemini_llm = GeminiLLM(
        model_name="gemini-2.0-flash-exp",
        temperature=0.8
    )
    
    # Configure Voice Agent Session with Deepgram and ElevenLabs
    voice_agent_session = AgentSession(
        # Speech-to-Text: Deepgram
        stt=deepgram.STT(
            model="nova-2",
            language="en-US",
            smart_format=True,
            punctuate=True
        ),
        
        # LLM: Gemini 2.5 Flash (custom wrapper)
        llm=gemini_llm,
        
        # Text-to-Speech: ElevenLabs
        tts=elevenlabs.TTS(
            voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
            model_id="eleven_monolingual_v1",
            api_key=os.getenv("ELEVENLABS_API_KEY")
        ),
        
        # Optional: VAD for better turn detection
        # Uncomment if you have silero installed:
        # from livekit.plugins import silero
        # vad=silero.VAD.load(),
    )
    
    # Create Voice Agent with interview coach instructions
    voice_agent = Agent(
        instructions="""You are Priya, a professional and friendly AI interview coach.

Your role:
- Conduct practice interviews for various technical positions
- Ask relevant questions about experience, skills, and projects
- Provide constructive feedback and encouragement
- Help candidates improve their interview performance
- Be professional but warm and supportive

Interview approach:
- Start with a friendly introduction
- Ask about background and experience
- Progress to role-specific technical questions
- Include behavioral questions using STAR method
- Provide tips and suggestions when appropriate
- End with candidate questions

Keep responses conversational and concise (2-3 sentences).
Listen actively and ask relevant follow-up questions.
"""
    )
    
    # Initialize Beyond Presence Avatar
    bey_avatar_id = os.getenv("BEY_AVATAR_ID")
    if not bey_avatar_id:
        print("⚠️ BEY_AVATAR_ID not found, avatar will not be displayed")
        bey_avatar_session = None
    else:
        bey_avatar_session = bey.AvatarSession(avatar_id=bey_avatar_id)
        print(f"✅ Beyond Presence Avatar initialized: {bey_avatar_id}")
    
    # Start voice agent session
    await voice_agent_session.start(agent=voice_agent, room=ctx.room)
    print("✅ Voice agent session started")
    
    # Start avatar session if available
    if bey_avatar_session:
        await bey_avatar_session.start(voice_agent_session, room=ctx.room)
        print("✅ Avatar session started")
    
    print("🎙️ Practice interview session is live!")


if __name__ == "__main__":
    # Load environment variables
    load_dotenv(".env.practice")
    
    print("=" * 60)
    print("🎯 Practice Mode - AI Interview Coach")
    print("=" * 60)
    print(f"   Model: Gemini 2.5 Flash")
    print(f"   STT: Deepgram Nova-2")
    print(f"   TTS: ElevenLabs")
    print(f"   Avatar: Beyond Presence")
    print("=" * 60)
    
    # Verify required environment variables
    required_vars = [
        "GEMINI_API_KEY",
        "DEEPGRAM_API_KEY", 
        "ELEVENLABS_API_KEY",
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("   Please add them to .env.practice")
        sys.exit(1)
    
    print("✅ All environment variables configured")
    print()
    
    # Override args for LiveKit CLI
    sys.argv = [sys.argv[0], "dev"]
    
    # Run the LiveKit agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )
