# Frontend Integration Guide

## 🎯 Overview

Complete guide to integrate the LiveKit practice agent with your React frontend.

## 📦 Installation

### 1. Install LiveKit Client SDK

```bash
cd frontend_interview
npm install livekit-client
```

### 2. Files Created

- `src/services/livekitService.ts` - LiveKit connection service
- `src/components/PracticeInterviewRoom.tsx` - Practice interview UI
- Updated `src/App.tsx` - Added route and import

## 🔧 Backend Requirements

### LiveKit Token Endpoint

Create this endpoint in your FastAPI backend:

```python
# /backendfastapi/app/api/routes/livekit_router.py

from fastapi import APIRouter
from pydantic import BaseModel
from livekit import api
import os

router = APIRouter()

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

@router.post("/token")
async def get_livekit_token(request: TokenRequest):
    """Generate LiveKit access token"""
    
    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    )
    
    token.with_identity(request.participant_name)
    token.with_name(request.participant_name)
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=request.room_name,
        can_publish=True,
        can_subscribe=True,
    ))
    
    return {"token": token.to_jwt()}
```

Add to `main.py`:
```python
from app.api.routes import livekit_router
app.include_router(livekit_router.router, prefix="/api/livekit", tags=["LiveKit"])
```

## 🚀 Usage Flow

### 1. User Starts Practice

```
User clicks "Start Practice" on agent card
    ↓
Navigate to /practice-session/{agentId}
    ↓
PracticeInterviewRoom component loads
```

### 2. Connection Setup

```
Component initializes
    ↓
Generate room name: practice-{agentId}-{timestamp}
    ↓
Request LiveKit token from backend
    ↓
Connect to LiveKit room
    ↓
Enable microphone and camera
```

### 3. Agent Joins

```
Frontend requests Beyond Presence agent creation
    ↓
Backend calls Beyond Presence API
    ↓
Agent joins LiveKit room
    ↓
Agent video/audio tracks appear
    ↓
Practice session begins
```

### 4. During Session

```
User speaks
    ↓
Audio sent to LiveKit room
    ↓
Agent (running on Node.js) receives audio
    ↓
Deepgram transcribes speech
    ↓
Gemini generates response
    ↓
ElevenLabs synthesizes speech
    ↓
Audio sent back to user
    ↓
Beyond Presence avatar animates
```

## 🎨 UI Components

### PracticeInterviewRoom Features

- ✅ Two-panel video layout (user + agent)
- ✅ Microphone toggle
- ✅ Camera toggle
- ✅ End session button
- ✅ Connection status indicators
- ✅ Error handling
- ✅ Responsive design

### Status Messages

- "Connecting..." - Initial connection
- "Waiting for AI coach..." - Agent not yet joined
- "✅ AI coach is ready" - Agent connected
- "Practice session is live!" - Ready to start

## 🔄 Complete Workflow

```typescript
// 1. User clicks "Start Practice"
navigate(`/practice-session/${agentId}`);

// 2. Component loads and initializes
const roomName = `practice-${agentId}-${Date.now()}`;
const token = await getLivekitToken(roomName, participantName);

// 3. Connect to LiveKit
const livekitService = new LiveKitService();
await livekitService.connect({ url, token, roomName });

// 4. Start Beyond Presence agent
await startBeyondPresenceAgent(roomName);

// 5. Agent joins and session begins
// User can now speak and interact with AI coach
```

## 📝 Code Examples

### Get LiveKit Token

```typescript
const token = await getLivekitToken('my-room', 'user-123');
```

### Connect to Room

```typescript
const service = new LiveKitService();
await service.connect({
  url: 'wss://interviewapp-86itzjcd.livekit.cloud',
  token: token,
  roomName: 'practice-room'
});
```

### Toggle Controls

```typescript
// Toggle microphone
const micEnabled = await service.toggleMicrophone();

// Toggle camera
const cameraEnabled = await service.toggleCamera();
```

### Disconnect

```typescript
await service.disconnect();
```

## 🐛 Troubleshooting

### "Failed to get LiveKit token"

**Problem**: Backend endpoint not responding

**Solution**:
1. Check backend is running on port 8002
2. Verify `/api/livekit/token` endpoint exists
3. Check CORS settings

### "Failed to connect to LiveKit"

**Problem**: Invalid token or URL

**Solution**:
1. Verify LIVEKIT_URL in backend .env
2. Check LIVEKIT_API_KEY and LIVEKIT_API_SECRET
3. Ensure token is not expired

### "Agent not appearing"

**Problem**: Beyond Presence agent not joining

**Solution**:
1. Check Node.js agent is running (`npm run dev`)
2. Verify BEY_API_KEY is valid
3. Check agent logs for errors
4. Ensure room name matches

### No Audio/Video

**Problem**: Tracks not publishing

**Solution**:
1. Check browser permissions for mic/camera
2. Verify LiveKit room grants (can_publish: true)
3. Check browser console for errors

## 🎯 Testing

### Test Backend Token Generation

```bash
curl -X POST http://localhost:8002/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "test-room",
    "participant_name": "test-user"
  }'
```

### Test Frontend Connection

1. Open browser console (F12)
2. Navigate to `/practice-session/1`
3. Look for logs:
   - "🔌 Connecting to LiveKit room"
   - "✅ Connected to LiveKit room"
   - "👤 Participant connected"

### Test Agent

1. Start Node.js agent: `cd livekit-agent && npm run dev`
2. Start practice session in frontend
3. Check agent logs for connection
4. Speak into microphone
5. Should hear AI response

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend (localhost:3000)                        │
│  - PracticeInterviewRoom component                      │
│  - LiveKit Client SDK                                   │
└────────────┬────────────────────────────────────────────┘
             │
             │ HTTP (get token)
             ↓
┌─────────────────────────────────────────────────────────┐
│  FastAPI Backend (localhost:8002)                       │
│  - /api/livekit/token - Generate tokens                │
│  - /api/beyond-presence/create-agent - Start agent     │
└────────────┬────────────────────────────────────────────┘
             │
             │ WebRTC
             ↓
┌─────────────────────────────────────────────────────────┐
│  LiveKit Server (interviewapp-86itzjcd.livekit.cloud)  │
│  - Manages rooms and participants                       │
│  - Routes audio/video streams                           │
└────────────┬────────────────────────────────────────────┘
             │
             │ WebRTC
             ↓
┌─────────────────────────────────────────────────────────┐
│  Node.js Agent (livekit-agent/)                         │
│  - Deepgram STT                                         │
│  - Gemini LLM                                           │
│  - ElevenLabs TTS                                       │
│  - Beyond Presence Avatar                               │
└─────────────────────────────────────────────────────────┘
```

## ✅ Checklist

Before starting a practice session:

- [ ] Backend running on port 8002
- [ ] Node.js agent running (`npm run dev`)
- [ ] All API keys configured
- [ ] LiveKit server accessible
- [ ] Browser has mic/camera permissions
- [ ] Frontend running on port 3000

## 🎉 Success!

When everything is working:

1. Navigate to Practice Mode
2. Click "Start Practice" on any agent
3. See "✅ AI coach is ready"
4. Speak into microphone
5. Hear AI coach respond
6. See Beyond Presence avatar animate

You're now ready for AI-powered interview practice! 🚀
