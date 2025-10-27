import asyncio
import os
import json
from typing import Annotated
from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.llm import LLM, ChatContext, ChatMessage
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.agents import vad
from livekit.agents.vad import VADCapabilities
from livekit.plugins import google, deepgram, silero, openai
import google.generativeai as genai
from app.core.config import settings
from app.services.avatar import AvatarService
from livekit.api import AccessToken, VideoGrants
import time

def generate_room_token(room_name: str) -> str:
    """Generate a LiveKit access token for the agent to join a room"""
    token = AccessToken(
        api_key=os.getenv("LIVEKIT_API_KEY", "APIabMqmQ8P4aRx"),
        api_secret=os.getenv("LIVEKIT_API_SECRET", "BrhWkwtTeBmYqeMIXEOqpnQFhG3Vvkfz3bffOezzKJQK")
    )
    token.with_identity("interview-agent")
    token.with_name("AI Interviewer")
    
    # Create video grants
    grants = VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    )
    token.with_grants(grants)
    
    return token.to_jwt()

async def run_direct_room_agent(room_name: str):
    """Run the agent by connecting directly to a specific room"""
    try:
        # Generate token for the agent
        token = generate_room_token(room_name)

        # Create room and connect
        from livekit.rtc import Room
        room = Room()

        # Set up event listeners
        room.on("participant_connected", lambda p: print(f"Participant connected: {p.identity}"))
        room.on("participant_disconnected", lambda p: print(f"Participant disconnected: {p.identity}"))

        # Connect to the room
        await room.connect(
            url=os.getenv("LIVEKIT_URL", "wss://interviewapp-86itzjcd.livekit.cloud"),
            token=token
        )

        print(f"Agent connected to room: {room_name}")

        # Create a mock JobContext
        class MockJobContext:
            def __init__(self, room):
                self.room = room
                self._is_mock = True

        ctx = MockJobContext(room)

        # Run the entrypoint
        await entrypoint(ctx)

    except Exception as e:
        print(f"Failed to run direct room agent: {e}")
        import traceback
        traceback.print_exc()

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_API_KEY)

class GeminiLLM(LLM):
    def __init__(self, model_name: str = "gemini-pro"):
        super().__init__()
        self.model = genai.GenerativeModel(model_name)
        self.chat_sessions = {}

    async def chat(self, ctx: ChatContext, fnc_ctx=None) -> str:
        # Get or create chat session for this context
        session_id = id(ctx)
        if session_id not in self.chat_sessions:
            self.chat_sessions[session_id] = self.model.start_chat(history=[])

        chat_session = self.chat_sessions[session_id]

        # Convert LiveKit messages to Gemini format
        messages = []
        for msg in ctx.messages:
            if msg.role == "user":
                messages.append({"role": "user", "parts": [msg.content]})
            elif msg.role == "assistant":
                messages.append({"role": "model", "parts": [msg.content]})

        # Add current message
        if ctx.messages and ctx.messages[-1].role == "user":
            user_message = ctx.messages[-1].content
        else:
            user_message = "Hello"

        try:
            response = chat_session.send_message(user_message)
            return response.text
        except Exception as e:
            print(f"Gemini API error: {e}")
            return "I apologize, but I'm having trouble processing your request right now. Could you please try again?"

def prewarm(proc: agents.JobProcess):
    """Prewarm the model for faster inference"""
    proc.userdata["gemini"] = GeminiLLM()

async def entrypoint(ctx):
    # Check if this is a mock context (direct room connection)
    if hasattr(ctx, '_is_mock') and ctx._is_mock:
        # Already connected, use the existing room
        pass
    else:
        # Normal job-based connection
        await ctx.connect()

    # Get agent ID from room metadata or participant attributes
    agent_id = ctx.room.metadata or os.getenv("AGENT_ID", "default")
    print(f"Starting interview agent: {agent_id} for room: {ctx.room.name}")

    # Interview preparation system prompt
    system_prompt = """
    You are an experienced technical interviewer conducting a mock interview for software engineering positions.

    Your role is to:
    1. Ask relevant technical questions based on the candidate's experience level
    2. Provide constructive feedback on their answers
    3. Help them improve their communication and problem-solving skills
    4. Maintain a professional, encouraging, and supportive tone
    5. Ask follow-up questions to deepen understanding
    6. Cover topics like algorithms, data structures, system design, and behavioral questions

    Guidelines:
    - Start with easier questions and gradually increase difficulty
    - Explain concepts when the candidate seems unsure
    - Give specific feedback on what was good and what could be improved
    - Encourage the candidate throughout the process
    - End the session with overall feedback and improvement suggestions

    Remember: Your goal is to help the candidate succeed in real interviews, not to trick them.

    Always respond naturally and conversationally, as if you're speaking to the candidate in a real interview.
    """

    # Initialize Gemini LLM using OpenAI-compatible API
    llm = openai.LLM(
        model="gemini-1.5-flash",
        api_key=settings.GOOGLE_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )

    # Create chat context with system prompt
    chat_ctx = ChatContext(messages=[
        ChatMessage(role="system", content=system_prompt)
    ])

    # Initialize avatar service
    avatar_service = AvatarService()

    # Create voice assistant with Gemini
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(
            model="nova-2",
            language="en-US",
            api_key=settings.DEEPGRAM_API_KEY
        ),
        llm=llm,
        tts=google.TTS(
            language="en-US",
            voice_name="en-US-Neural2-D",
            speaking_rate=1.0,
        ),
        chat_ctx=chat_ctx,
    )

    # Add event handlers for avatar integration
    @assistant.on("response_generated")
    def on_response_generated(response: str):
        # Generate avatar animation based on the response
        asyncio.create_task(generate_avatar_response(ctx.room.name, response))

    async def generate_avatar_response(room_name: str, text: str):
        try:
            # Analyze sentiment/emotion from the text
            emotion = "neutral"  # You could implement sentiment analysis here

            # Generate avatar response
            avatar_data = await avatar_service.generate_avatar(
                session_id=room_name,
                emotion=emotion,
                text=text
            )

            # Send avatar data to room participants
            await ctx.room.local_participant.publish_data(
                data=json.dumps({
                    "type": "avatar_update",
                    "avatar_url": avatar_data["avatar_url"],
                    "animation_data": avatar_data.get("animation_data"),
                    "text": text
                }).encode(),
                topic="avatar"
            )
        except Exception as e:
            print(f"Avatar generation failed: {e}")

    # Start the assistant
    assistant.start(ctx.room)

if __name__ == "__main__":
    # Check if we should run in direct room mode
    room_name = os.getenv("LIVEKIT_ROOM")
    if room_name:
        # Run in direct room connection mode
        print(f"Connecting directly to room: {room_name}")
        try:
            asyncio.run(run_direct_room_agent(room_name))
        except KeyboardInterrupt:
            print("Agent interrupted, shutting down gracefully")
        except Exception as e:
            print(f"Agent failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        # Run as worker
        cli.run_app(
            WorkerOptions(
                entrypoint_fnc=entrypoint,
                prewarm_fnc=prewarm,
            )
        )