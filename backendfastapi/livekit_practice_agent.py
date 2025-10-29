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
from livekit.plugins.google.realtime import RealtimeModel


async def entrypoint(ctx: JobContext) -> None:
    """Main entrypoint for the LiveKit agent"""
    
    print("🚀 Starting Practice Mode Agent...")
    print(f"   Room: {ctx.room.name}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Initialize Google Gemini Realtime Model
    gemini_llm = RealtimeModel(
        api_key=os.getenv("GEMINI_API_KEY"),
        voice="Kore",  # More natural female voice
        temperature=1.2  # Higher temperature for more natural, varied responses
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
        
        # Text-to-Speech: ElevenLabs
        tts=elevenlabs.TTS(
            voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
            api_key=os.getenv("ELEVENLABS_API_KEY")
        ),
        
        # Optional: VAD for better turn detection
        # Uncomment if you have silero installed:
        # from livekit.plugins import silero
        # vad=silero.VAD.load(),
    )
    
    # Create Voice Agent with interview coach instructions and LLM
    voice_agent = Agent(
        instructions="""You are Priya, a friendly and experienced interview coach who has helped hundreds of people land their dream jobs. You're warm, encouraging, and speak like a real person - not a robot.

When someone starts practicing with you, greet them naturally like you would a friend. Ask about their background in a conversational way, not like you're reading from a script.

During the interview:
- Listen carefully and respond like you're genuinely interested
- Ask follow-up questions that show you understand what they said
- Give real feedback - both positive encouragement and gentle suggestions for improvement
- Share relevant tips and insights from your experience coaching others
- Keep the conversation flowing naturally, not rigidly structured

Remember, you're here to help them feel confident and prepared. Be supportive, use contractions, and speak like a knowledgeable friend who's been through this many times.

Start every session with a warm, personal greeting and end by asking if they have questions for you.""",
        llm=gemini_llm  # Pass the LLM to the Agent
    )
    
    # Prevent multiple avatar sessions per room
    if not hasattr(entrypoint, "_active_avatar_rooms"):
        entrypoint._active_avatar_rooms = set()
    bey_avatar_id = os.getenv("BEY_AVATAR_ID")
    if not bey_avatar_id:
        print("⚠️ BEY_AVATAR_ID not found, avatar will not be displayed")
        bey_avatar_session = None
    else:
        room_name = ctx.room.name
        if room_name in entrypoint._active_avatar_rooms:
            print(f"⚠️ Avatar session already started for room: {room_name}")
            bey_avatar_session = None
        else:
            bey_avatar_session = bey.AvatarSession(avatar_id=bey_avatar_id)
            entrypoint._active_avatar_rooms.add(room_name)
            print(f"✅ Beyond Presence Avatar initialized: {bey_avatar_id}")

    # Start voice agent session
    await voice_agent_session.start(agent=voice_agent, room=ctx.room)
    print("✅ Voice agent session started")

    # Start avatar session if available
    if bey_avatar_session:
        await bey_avatar_session.start(voice_agent_session, room=ctx.room)
        print("✅ Avatar session started")

    print("🎙️ Practice interview session is live!")
    print("👂 Listening for user speech...")


if __name__ == "__main__":
    # Load environment variables
    load_dotenv(".env.practice")
    
    print("=" * 60)
    print("🎯 Practice Mode - AI Interview Coach")
    print("=" * 60)
    print(f"   Model: Gemini 2.0 Flash Realtime")
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
    
async def accept_all_rooms(job_req):
    print("accept_all_rooms called")
    await job_req.accept()
    return None

if __name__ == '__main__':
    # Run the LiveKit agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            request_fnc=accept_all_rooms,
        )
    )
