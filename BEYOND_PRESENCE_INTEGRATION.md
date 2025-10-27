# Beyond Presence API Integration Guide

## 🎯 Overview

This guide explains how to integrate Beyond Presence avatars with your interview platform using their REST API.

## 📋 API Endpoints

### 1. Create Agent

Creates a Beyond Presence agent in a LiveKit room.

**Endpoint**: `POST https://api.bey.dev/v1/agent`

**Headers**:
```bash
Content-Type: application/json
x-api-key: YOUR_BEY_API_KEY
```

**Request Body**:
```json
{
  "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
  "livekit_token": "<your-livekit-token>",
  "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud"
}
```

**Example**:
```bash
curl https://api.bey.dev/v1/agent \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $BEY_API_KEY" \
  -d '{
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "livekit_token": "<your-livekit-token>",
    "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud"
  }'
```

### 2. Create Call

Starts a call session with the Beyond Presence avatar.

**Endpoint**: `POST https://api.bey.dev/v1/calls`

**Headers**:
```bash
Content-Type: application/json
x-api-key: YOUR_BEY_API_KEY
```

**Request Body**:
```json
{
  "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
  "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud",
  "livekit_token": "<livekit-token>",
  "language": "english"
}
```

**Example**:
```bash
curl --request POST \
  --url https://api.bey.dev/v1/calls \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: YOUR_BEY_API_KEY' \
  --data '{
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud",
    "livekit_token": "<livekit-token>",
    "language": "english"
  }'
```

## 🔧 FastAPI Integration

I've created a FastAPI router that wraps these API calls:

### Endpoints

**1. Create Agent**
```
POST /api/beyond-presence/create-agent
```

**Request**:
```json
{
  "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
  "livekit_token": "your_token",
  "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud"
}
```

**Response**:
```json
{
  "success": true,
  "agent_id": "agent_123",
  "data": {...},
  "message": "Agent created successfully"
}
```

**2. Create Call**
```
POST /api/beyond-presence/create-call
```

**Request**:
```json
{
  "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
  "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud",
  "livekit_token": "your_token",
  "language": "english"
}
```

**Response**:
```json
{
  "success": true,
  "call_id": "call_456",
  "data": {...},
  "message": "Call created successfully"
}
```

**3. Health Check**
```
GET /api/beyond-presence/health
```

**4. Test Connection**
```
POST /api/beyond-presence/test-connection
```

## 🚀 Usage from Frontend

### TypeScript/React Example

```typescript
// Create agent
const createAgent = async (livekitToken: string) => {
  const response = await fetch('http://localhost:8002/api/beyond-presence/create-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      avatar_id: '694c83e2-8895-4a98-bd16-56332ca3f449',
      livekit_token: livekitToken,
      livekit_url: 'wss://interviewapp-86itzjcd.livekit.cloud'
    })
  });
  
  const data = await response.json();
  console.log('Agent created:', data);
  return data.agent_id;
};

// Create call
const createCall = async (livekitToken: string) => {
  const response = await fetch('http://localhost:8002/api/beyond-presence/create-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      avatar_id: '694c83e2-8895-4a98-bd16-56332ca3f449',
      livekit_url: 'wss://interviewapp-86itzjcd.livekit.cloud',
      livekit_token: livekitToken,
      language: 'english'
    })
  });
  
  const data = await response.json();
  console.log('Call created:', data);
  return data.call_id;
};

// Usage in component
const startInterview = async () => {
  // 1. Get LiveKit token from your backend
  const livekitToken = await getLivekitToken();
  
  // 2. Create Beyond Presence agent
  const agentId = await createAgent(livekitToken);
  
  // 3. Create call session
  const callId = await createCall(livekitToken);
  
  // 4. Connect to LiveKit room
  // Your LiveKit connection code here
};
```

## 📝 Configuration

### Environment Variables

Add to `/backendfastapi/.env.practice`:

```bash
# Beyond Presence API Key
BEY_API_KEY=your_beyond_presence_api_key_here

# Beyond Presence Avatar ID
BEY_AVATAR_ID=694c83e2-8895-4a98-bd16-56332ca3f449

# LiveKit Configuration
LIVEKIT_URL=wss://interviewapp-86itzjcd.livekit.cloud
LIVEKIT_API_KEY=APIabMqmQ8P4aRx
LIVEKIT_API_SECRET=BrhWkwtTeBmYqeMIXEOqpnQFhG3Vvkfz3bffOezzKJQK
```

## 🔄 Complete Workflow

```
1. User starts interview
   ↓
2. Frontend requests LiveKit token from backend
   ↓
3. Backend generates LiveKit token
   ↓
4. Frontend calls /api/beyond-presence/create-agent
   ↓
5. Backend calls Beyond Presence API to create agent
   ↓
6. Frontend calls /api/beyond-presence/create-call
   ↓
7. Backend calls Beyond Presence API to start call
   ↓
8. Frontend connects to LiveKit room
   ↓
9. Beyond Presence avatar appears in room
   ↓
10. Interview begins with voice/video
```

## 🧪 Testing

### Test Backend Integration

```bash
# 1. Test health
curl http://localhost:8002/api/beyond-presence/health

# 2. Test connection
curl -X POST http://localhost:8002/api/beyond-presence/test-connection

# 3. Test agent creation (need valid LiveKit token)
curl -X POST http://localhost:8002/api/beyond-presence/create-agent \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "livekit_token": "YOUR_LIVEKIT_TOKEN",
    "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud"
  }'
```

### Test Direct API

```bash
# Test Beyond Presence API directly
curl https://api.bey.dev/v1/agent \
  -H 'Content-Type: application/json' \
  -H "x-api-key: YOUR_BEY_API_KEY" \
  -d '{
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "livekit_token": "YOUR_LIVEKIT_TOKEN",
    "livekit_url": "wss://interviewapp-86itzjcd.livekit.cloud"
  }'
```

## 🐛 Troubleshooting

### 401 Unauthorized

**Problem**: Invalid API key

**Solution**: Check `BEY_API_KEY` in `.env.practice`

### 400 Bad Request

**Problem**: Invalid request parameters

**Solution**: Verify:
- `avatar_id` is correct
- `livekit_token` is valid and not expired
- `livekit_url` matches your LiveKit server

### 504 Timeout

**Problem**: Request taking too long

**Solution**: Check network connectivity and Beyond Presence API status

### Agent Not Appearing

**Problem**: Agent created but not visible in room

**Solution**:
1. Verify LiveKit token has correct permissions
2. Check room name matches
3. Ensure avatar_id is valid
4. Check LiveKit server logs

## 📊 Response Examples

### Successful Agent Creation

```json
{
  "success": true,
  "agent_id": "agent_abc123",
  "data": {
    "agent_id": "agent_abc123",
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "status": "active",
    "created_at": "2025-10-27T23:00:00Z"
  },
  "message": "Agent created successfully"
}
```

### Successful Call Creation

```json
{
  "success": true,
  "call_id": "call_xyz789",
  "data": {
    "call_id": "call_xyz789",
    "avatar_id": "694c83e2-8895-4a98-bd16-56332ca3f449",
    "status": "active",
    "language": "english",
    "started_at": "2025-10-27T23:01:00Z"
  },
  "message": "Call created successfully"
}
```

## 🔐 Security Best Practices

1. **Never expose API keys** in frontend code
2. **Always use backend** to make Beyond Presence API calls
3. **Validate LiveKit tokens** before creating agents
4. **Implement rate limiting** on your endpoints
5. **Log all API calls** for debugging and monitoring

## 📚 Additional Resources

- [Beyond Presence API Documentation](https://docs.bey.dev)
- [LiveKit Documentation](https://docs.livekit.io)
- [Your Avatar Dashboard](https://bey.chat/dashboard)

## ✅ Summary

You now have:
- ✅ FastAPI router for Beyond Presence API
- ✅ Endpoints for agent and call creation
- ✅ Environment configuration
- ✅ Testing examples
- ✅ Frontend integration examples

Ready to integrate Beyond Presence avatars into your interviews! 🎉
