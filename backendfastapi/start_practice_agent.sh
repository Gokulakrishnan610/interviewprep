#!/bin/bash

# Start Practice Mode LiveKit Agent
# Uses Gemini 2.5 Flash, Deepgram, and ElevenLabs

echo "=========================================="
echo "🎯 Starting Practice Mode Agent"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing dependencies..."
pip install -r requirements_livekit.txt

# Check if .env.practice exists
if [ ! -f ".env.practice" ]; then
    echo "❌ Error: .env.practice file not found!"
    echo "   Please create .env.practice with your API keys"
    exit 1
fi

# Load environment variables
export $(cat .env.practice | grep -v '^#' | xargs)

# Verify required variables
echo ""
echo "🔍 Verifying configuration..."

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set"
    exit 1
fi
echo "✅ Gemini API Key configured"

if [ -z "$DEEPGRAM_API_KEY" ]; then
    echo "❌ DEEPGRAM_API_KEY not set"
    exit 1
fi
echo "✅ Deepgram API Key configured"

if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "❌ ELEVENLABS_API_KEY not set"
    exit 1
fi
echo "✅ ElevenLabs API Key configured"

if [ -z "$LIVEKIT_URL" ]; then
    echo "❌ LIVEKIT_URL not set"
    exit 1
fi
echo "✅ LiveKit URL configured"

if [ -z "$LIVEKIT_API_KEY" ]; then
    echo "❌ LIVEKIT_API_KEY not set"
    exit 1
fi
echo "✅ LiveKit API Key configured"

if [ -z "$LIVEKIT_API_SECRET" ]; then
    echo "❌ LIVEKIT_API_SECRET not set"
    exit 1
fi
echo "✅ LiveKit API Secret configured"

echo ""
echo "=========================================="
echo "🚀 Starting LiveKit Agent..."
echo "=========================================="
echo ""
echo "   Model: Gemini 2.5 Flash"
echo "   STT: Deepgram Nova-2"
echo "   TTS: ElevenLabs"
echo "   Avatar: Beyond Presence"
echo ""
echo "=========================================="
echo ""

# Run the agent
python livekit_practice_agent.py

# Deactivate virtual environment on exit
deactivate
