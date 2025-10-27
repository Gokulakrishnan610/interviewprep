# Interview Practice Server (Node.js)

## 🎯 Overview

Simple Express server that integrates with Beyond Presence:
- **Google Gemini 1.5 Flash** for AI responses
- **Beyond Presence API** for avatar and voice
- **Express** for REST API

Note: Beyond Presence handles STT, TTS, and avatar internally.

## 📦 Installation

```bash
cd livekit-agent
npm install
```

## 🔧 Configuration

Edit `.env` file and add your API keys:

```bash
# Required
LIVEKIT_URL=wss://interviewapp-86itzjcd.livekit.cloud
LIVEKIT_API_KEY=APIabMqmQ8P4aRx
LIVEKIT_API_SECRET=BrhWkwtTeBmYqeMIXEOqpnQFhG3Vvkfz3bffOezzKJQK

BEY_AVATAR_ID=694c83e2-8895-4a98-bd16-56332ca3f449
BEY_API_KEY=sk-s5MCPaFRud95-L5GtYuk0Alo-393BL6l58vUr3BqVjY

DEEPGRAM_API_KEY=your_deepgram_api_key_here
ELEVENLABS_API_KEY=sk_2f8bf57e574bf7374e2c5fc6f71678a0352367eb307f3cc3
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 Usage

### Start the Agent

```bash
npm run dev
```

Or:

```bash
node index.js
```

### What Happens

1. Agent connects to LiveKit server
2. Waits for users to join the room
3. When user joins:
   - Deepgram transcribes user's speech
   - Gemini 2.5 Flash generates intelligent responses
   - ElevenLabs synthesizes speech
   - Beyond Presence avatar animates

## 📝 Features

- ✅ Real-time voice conversation
- ✅ Professional interview coach personality
- ✅ Natural speech synthesis
- ✅ Accurate speech recognition
- ✅ Visual avatar with Beyond Presence

## 🎭 Agent Personality

The agent (Priya) acts as a professional interview coach:
- Asks relevant interview questions
- Provides constructive feedback
- Encourages candidates
- Adapts to different interview types

## 🔄 Workflow

```
User joins room
    ↓
User speaks
    ↓
Deepgram transcribes
    ↓
Gemini generates response
    ↓
ElevenLabs synthesizes speech
    ↓
Beyond Presence avatar speaks
    ↓
Repeat
```

## 🐛 Troubleshooting

### Agent Won't Start

**Check**:
1. All API keys are configured
2. LiveKit server is accessible
3. Node.js version >= 18

### No Audio

**Check**:
1. ElevenLabs API key is valid
2. Voice ID is correct
3. Browser has microphone permissions

### Avatar Not Visible

**Check**:
1. BEY_AVATAR_ID is correct
2. BEY_API_KEY is valid
3. LiveKit room name matches

## 📊 API Keys Needed

1. **LiveKit** - Get from https://cloud.livekit.io
2. **Beyond Presence** - Get from https://bey.chat
3. **Deepgram** - Get from https://deepgram.com
4. **ElevenLabs** - Already provided
5. **Google Gemini** - Get from https://makersuite.google.com/app/apikey

## 🎯 Next Steps

1. Add your API keys to `.env`
2. Run `npm install`
3. Run `npm run dev`
4. Connect from your React frontend
5. Start practicing interviews!

## 📞 Support

Check logs for errors:
```bash
node index.js
```

Test connection:
```bash
curl $LIVEKIT_URL
```
