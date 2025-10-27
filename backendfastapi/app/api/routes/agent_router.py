from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import subprocess
import os
import asyncio
from typing import Optional
from dotenv import load_dotenv
from app.services.avatar import AvatarService
from livekit.api import AccessToken, VideoGrants
import time
import uuid

router = APIRouter()

class AgentStartRequest(BaseModel):
    room_name: str
    agent_type: str = "interview"
    agent_id: Optional[str] = None

class AgentStatusResponse(BaseModel):
    status: str
    room_name: str
    agent_type: str
    pid: Optional[int] = None

# Store running agents
running_agents = {}

class PracticeSessionRequest(BaseModel):
    agent_id: str

class PracticeSessionResponse(BaseModel):
    room_name: str
    room_token: str
    agent_id: str

@router.post("/start_practice", response_model=PracticeSessionResponse)
async def start_practice_session(request: PracticeSessionRequest, background_tasks: BackgroundTasks):
    """Start a practice interview session with an AI agent"""
    try:
        # Load environment variables
        load_dotenv()
        
        # Generate unique room name
        room_name = f"practice-{uuid.uuid4().hex[:8]}"
        
        # Generate LiveKit access token for the user
        token = AccessToken(
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET")
        )
        token.with_identity(f"user-{uuid.uuid4().hex[:8]}")
        token.with_name("Practice User")
        token.with_grants(VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        ))
        
        room_token = token.to_jwt()
        
        # Start the agent for this room
        agent_request = AgentStartRequest(
            room_name=room_name,
            agent_type="interview",
            agent_id=request.agent_id
        )
        
        # Call the existing start_agent function
        await start_agent(agent_request, background_tasks)
        
        return PracticeSessionResponse(
            room_name=room_name,
            room_token=room_token,
            agent_id=request.agent_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start practice session: {str(e)}")

@router.post("/start", response_model=AgentStatusResponse)
async def start_agent(request: AgentStartRequest, background_tasks: BackgroundTasks):
    """Start a LiveKit agent for a room"""
    print(f"START_AGENT called for room: {request.room_name}")

    try:
        # Check if agent is already running for this room
        if request.room_name in running_agents:
            return AgentStatusResponse(
                status="already_running",
                room_name=request.room_name,
                agent_type=request.agent_type,
                pid=running_agents[request.room_name]
            )


        # Start the agent in background
        async def run_agent():
            try:
                # Load environment variables from .env file
                load_dotenv()
                
                # Set environment variables for the agent
                env = os.environ.copy()
                env["LIVEKIT_ROOM"] = request.room_name
                env["AGENT_TYPE"] = request.agent_type
                if request.agent_id:
                    env["AGENT_ID"] = request.agent_id
                # Set PYTHONPATH to include the backendfastapi directory
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                env["PYTHONPATH"] = backend_dir
                
                script_path = "app/agents/interview_agent.py"  # Relative to cwd
                cwd = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))  # x:\interviewprep\backendfastapi

                import sys
                venv_python = sys.executable  # Use the same python executable as the server
                print(f"Using Python executable: {venv_python}")
                print(f"Script path: {script_path}")
                print(f"Working directory: {cwd}")
                print(f"PYTHONPATH: {env.get('PYTHONPATH')}")
                print(f"Python path exists: {os.path.exists(venv_python)}")
                print(f"Script path exists: {os.path.exists(script_path)}")
                
                try:
                    # On Windows, use CREATE_NEW_PROCESS_GROUP to make the process independent
                    import platform
                    creationflags = 0
                    if platform.system() == 'Windows':
                        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP
                    
                    process = subprocess.Popen([
                        venv_python, script_path
                    ], env=env, cwd=cwd, 
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       creationflags=creationflags,
                       start_new_session=True)

                    # Store the actual process PID
                    running_agents[request.room_name] = process.pid
                    print(f"Agent started for room: {request.room_name} with PID: {process.pid}")
                    
                    # Give the process a moment to start up
                    await asyncio.sleep(1)
                    
                    # Don't wait for the process - let it run in background
                    # The agent is designed to run continuously
                    
                except Exception as e:
                    print(f"Failed to start subprocess: {e}")
                    with open("agent_log.txt", "a") as f:
                        f.write(f"Failed to start subprocess for room {request.room_name}: {e}\n")
                    raise HTTPException(status_code=500, detail=f"Failed to start agent subprocess: {str(e)}")

                # Log successful start
                with open("agent_log.txt", "a") as f:
                    f.write(f"Room: {request.room_name}, PID: {process.pid} - STARTED\n---\n")

            except Exception as e:
                print(f"Agent failed to start: {e}")
                import traceback
                traceback.print_exc()
                if request.room_name in running_agents:
                    del running_agents[request.room_name]

        # Run agent in background
        background_tasks.add_task(run_agent)

        return AgentStatusResponse(
            status="started",
            room_name=request.room_name,
            agent_type=request.agent_type,
            pid=running_agents.get(request.room_name, 0)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start agent: {str(e)}")

@router.post("/stop/{room_name}")
async def stop_agent(room_name: str):
    """Stop a LiveKit agent for a room"""

    if room_name not in running_agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
        pid = running_agents[room_name]
        # Note: In a real implementation, you'd want to properly terminate the process
        # For now, we'll just remove it from our tracking
        del running_agents[room_name]

        return {"status": "stopped", "room_name": room_name, "pid": pid}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop agent: {str(e)}")

@router.get("/status/{room_name}")
async def get_agent_status(room_name: str):
    """Get the status of an agent for a room"""

    if room_name in running_agents:
        return AgentStatusResponse(
            status="running",
            room_name=room_name,
            agent_type="interview",  # You might want to store this per agent
            pid=running_agents[room_name]
        )
    else:
        return AgentStatusResponse(
            status="not_running",
            room_name=room_name,
            agent_type="interview"
        )