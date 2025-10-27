#!/usr/bin/env python3
"""
Interview Agent Runner
Runs the LiveKit interview agent with Gemini AI and Beyond Presence avatars
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from livekit.agents import cli

if __name__ == "__main__":
    # Set the agent module to run
    os.environ.setdefault("LIVEKIT_AGENT_MODULE", "app.agents.interview_agent")

    # Run the agent using LiveKit CLI
    cli.run_app()