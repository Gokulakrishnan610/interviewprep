# Practice Mode - AI Interview Coach

## 🎯 Overview

Practice Mode uses **Gemini 2.5 Flash**, **Deepgram**, and **ElevenLabs** to provide an interactive AI interview coaching experience.

## 🔧 Technology Stack

- **LLM**: Google Gemini 2.5 Flash (`gemini-2.0-flash-exp`)
- **STT**: Deepgram (Speech-to-Text)
- **TTS**: ElevenLabs (Text-to-Speech)
- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript

## 📦 Setup

### 1. Environment Configuration

Create `.env.practice` in the `backendfastapi` directory:

```bash
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Deepgram API (for STT)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# ElevenLabs API (for TTS)
ELEVENLABS_API_KEY=sk_2f8bf57e574bf7374e2c5fc6f71678a0352367eb307f3cc3

# LiveKit Configuration
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Beyond Presence Avatar
BEY_AVATAR_ID=bbe33449-03e7-43ae-b6d5-5c8bf138f52a

# Practice Mode Settings
MODE=practice
```

### 2. Install Dependencies

```bash
cd backendfastapi
pip install google-generativeai deepgram-sdk elevenlabs
```

### 3. Start Backend

```bash
cd backendfastapi
uvicorn app.main:app --reload --port 8002
```

## 🎮 API Endpoints

### Start Practice Session

```bash
POST /api/practice/start-practice
```

**Request Body:**
```json
{
  "session_id": "practice_12345",
  "user_id": "user_001",
  "position": "Backend Developer",
  "difficulty": "intermediate"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "practice_12345",
  "initial_message": "Hello! I'm Priya...",
  "position": "Backend Developer"
}
```

### Send Message

```bash
POST /api/practice/practice-message/{session_id}
```

**Request Body:**
```json
{
  "role": "user",
  "content": "I have 3 years of experience with Python and FastAPI",
  "timestamp": "2025-10-27T22:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "practice_12345",
  "response": "That's great! Can you tell me about a challenging project...",
  "message_count": 4
}
```

### End Practice Session

```bash
POST /api/practice/end-practice/{session_id}
```

**Response:**
```json
{
  "success": true,
  "session_id": "practice_12345",
  "feedback": "Overall Performance:\nYou demonstrated...",
  "message_count": 12,
  "duration": "15 minutes"
}
```

### Get Session Data

```bash
GET /api/practice/practice-session/{session_id}
```

### Get Transcript

```bash
GET /api/practice/practice-transcript/{session_id}
```

### Health Check

```bash
GET /api/practice/health
```

**Response:**
```json
{
  "status": "available",
  "gemini_available": true,
  "active_sessions": 2,
  "model": "gemini-2.0-flash-exp"
}
```

## 🎨 Features

### 1. Intelligent Conversation

- **Context-aware responses** using Gemini 2.5 Flash
- **Position-specific questions** (Backend Developer, Frontend, etc.)
- **Difficulty levels**: Beginner, Intermediate, Advanced
- **Natural conversation flow**

### 2. Real-time Feedback

- **Constructive criticism** during the interview
- **Encouragement** and positive reinforcement
- **Actionable suggestions** for improvement

### 3. Comprehensive Analysis

After the interview:
- **Overall Performance** summary
- **Strengths** (3-5 points)
- **Areas for Improvement** (3-5 points)
- **Specific Recommendations** (3-5 points)

### 4. Multi-modal Support

- **Text chat** (currently implemented)
- **Voice input** (via Deepgram - ready to integrate)
- **Voice output** (via ElevenLabs - ready to integrate)

## 🔄 Workflow

```
1. User starts practice session
   ↓
2. Backend creates session with Gemini 2.5 Flash
   ↓
3. AI sends initial greeting
   ↓
4. User responds (text or voice)
   ↓
5. Deepgram transcribes (if voice)
   ↓
6. Gemini generates contextual response
   ↓
7. ElevenLabs synthesizes speech (if enabled)
   ↓
8. Repeat steps 4-7
   ↓
9. User ends session
   ↓
10. Gemini generates comprehensive feedback
```

## 💡 Usage Examples

### Python Example

```python
import requests

# Start practice session
response = requests.post('http://localhost:8002/api/practice/start-practice', json={
    "session_id": "practice_001",
    "user_id": "gokul",
    "position": "Backend Developer",
    "difficulty": "intermediate"
})

session = response.json()
print(session['initial_message'])

# Send user message
response = requests.post(f'http://localhost:8002/api/practice/practice-message/{session["session_id"]}', json={
    "role": "user",
    "content": "I have 3 years of experience with Python, FastAPI, and PostgreSQL",
    "timestamp": "2025-10-27T22:30:00Z"
})

ai_response = response.json()
print(ai_response['response'])

# End session and get feedback
response = requests.post(f'http://localhost:8002/api/practice/end-practice/{session["session_id"]}')
feedback = response.json()
print(feedback['feedback'])
```

### JavaScript/React Example

```javascript
// Start practice session
const startPractice = async () => {
  const response = await fetch('http://localhost:8002/api/practice/start-practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: `practice_${Date.now()}`,
      user_id: 'user_001',
      position: 'Backend Developer',
      difficulty: 'intermediate'
    })
  });
  
  const data = await response.json();
  console.log(data.initial_message);
  return data.session_id;
};

// Send message
const sendMessage = async (sessionId, message) => {
  const response = await fetch(`http://localhost:8002/api/practice/practice-message/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    })
  });
  
  const data = await response.json();
  return data.response;
};

// End practice
const endPractice = async (sessionId) => {
  const response = await fetch(`http://localhost:8002/api/practice/end-practice/${sessionId}`, {
    method: 'POST'
  });
  
  const data = await response.json();
  return data.feedback;
};
```

## 🎯 Interview Types Supported

### Technical Interviews
- **Backend Developer**: Python, FastAPI, databases, APIs
- **Frontend Developer**: React, TypeScript, CSS, performance
- **Full Stack**: Both frontend and backend
- **DevOps**: CI/CD, Docker, Kubernetes, cloud

### Behavioral Interviews
- **Leadership**: Team management, conflict resolution
- **Problem Solving**: Analytical thinking, decision making
- **Communication**: Presentation skills, stakeholder management

### Mixed Interviews
- Combination of technical and behavioral questions
- Real-world scenario discussions
- System design questions

## 🔧 Customization

### Adjust AI Personality

Edit `practice_router.py`:

```python
prompt = f"""You are Priya, an expert AI interview coach.

Personality:
- Professional but friendly
- Encouraging and supportive
- Direct and honest with feedback
- Patient and understanding

Interview Style:
- Start with easy questions
- Gradually increase difficulty
- Ask follow-up questions
- Provide hints when needed
"""
```

### Change Difficulty Levels

```python
difficulty_settings = {
    "beginner": {
        "question_complexity": "basic",
        "technical_depth": "surface level",
        "hints_provided": True
    },
    "intermediate": {
        "question_complexity": "moderate",
        "technical_depth": "detailed",
        "hints_provided": "sometimes"
    },
    "advanced": {
        "question_complexity": "complex",
        "technical_depth": "in-depth",
        "hints_provided": False
    }
}
```

## 📊 Feedback Format

```
Overall Performance:
You demonstrated strong technical knowledge and communicated your ideas clearly. 
Your responses showed good understanding of backend development concepts.

Strengths:
• Clear and structured responses
• Good technical knowledge of Python and FastAPI
• Confident communication style
• Relevant examples from experience

Areas for Improvement:
• Could provide more specific metrics and numbers
• Expand on problem-solving approaches
• Discuss trade-offs in technical decisions
• Ask more clarifying questions

Specific Recommendations:
• Practice the STAR method for behavioral questions
• Prepare specific examples with measurable outcomes
• Research common system design patterns
• Practice explaining complex concepts simply
```

## 🚀 Future Enhancements

### Phase 1 (Current)
- ✅ Text-based conversation
- ✅ Gemini 2.5 Flash integration
- ✅ Comprehensive feedback
- ✅ Multiple interview types

### Phase 2 (Next)
- 🔄 Deepgram voice input integration
- 🔄 ElevenLabs voice output integration
- 🔄 Real-time transcription display
- 🔄 Voice activity detection

### Phase 3 (Future)
- 📋 Video recording and analysis
- 📋 Body language feedback
- 📋 Facial expression analysis
- 📋 Presentation skills evaluation

## 🐛 Troubleshooting

### Gemini API Errors

**Problem**: `GEMINI_API_KEY not found`

**Solution**:
```bash
# Add to .env.practice
GEMINI_API_KEY=your_actual_api_key_here
```

### Model Not Available

**Problem**: `gemini-2.0-flash-exp not found`

**Solution**: Update model name in `practice_router.py`:
```python
gemini_model = genai.GenerativeModel('gemini-pro')  # Fallback
```

### CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**: Check `settings.ALLOWED_ORIGINS` includes your frontend URL

## 📝 Testing

```bash
# Test health endpoint
curl http://localhost:8002/api/practice/health

# Test practice session
curl -X POST http://localhost:8002/api/practice/start-practice \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "user_id": "test_user",
    "position": "Backend Developer",
    "difficulty": "intermediate"
  }'
```

## 🎓 Best Practices

1. **Start with easy questions** to build confidence
2. **Use STAR method** for behavioral questions
3. **Provide specific examples** with metrics
4. **Ask clarifying questions** when needed
5. **Practice regularly** to improve

## 📞 Support

For issues or questions:
1. Check logs: `tail -f logs/practice.log`
2. Verify API keys are correct
3. Test with health endpoint
4. Review conversation history

## ✅ Summary

Practice Mode provides an intelligent, adaptive interview coaching experience using state-of-the-art AI models:

- **Gemini 2.5 Flash** for natural, context-aware conversations
- **Deepgram** for accurate speech recognition
- **ElevenLabs** for natural-sounding voice synthesis

Perfect for preparing for real interviews! 🎉
