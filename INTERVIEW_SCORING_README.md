# Interview Conversation Capture & Scoring System

## Overview
This system captures conversations from the Beyond Presence agent during interviews and uses AI (Google Gemini) to generate comprehensive scores and feedback.

## Architecture

### Backend (FastAPI - Port 8002)

#### New Router: `/api/interview`
Located at: `test/backend/app/routers/interview_router.py`

**Endpoints:**

1. **POST `/api/interview/start-session`**
   - Initializes a new interview session
   - Body: `{ session_id, user_id, interview_type }`
   - Returns: `{ success: true, session_id }`

2. **POST `/api/interview/add-message/{session_id}`**
   - Adds a conversation message to the session
   - Body: `{ speaker, message, timestamp }`
   - Returns: `{ success: true }`

3. **POST `/api/interview/end-session/{session_id}`**
   - Ends the interview and generates AI scores
   - Returns: `{ success: true, session_id, scores }`

4. **GET `/api/interview/session/{session_id}`**
   - Retrieves full session data
   - Returns: `{ success: true, data: {...} }`

5. **GET `/api/interview/session/{session_id}/transcript`**
   - Gets the conversation transcript
   - Returns: `{ success: true, transcript: [...] }`

### Frontend (React)

#### Updated Components:

**1. InterviewRoom.tsx**
- Captures conversation from Beyond Presence iframe via `postMessage` API
- Sends messages to backend in real-time
- On exit, triggers scoring and navigates to results page

**Key Features:**
- Session ID generation
- Message listener for iframe communication
- Automatic conversation logging
- Score retrieval on interview end

**2. InterviewResults.tsx** (New)
- Displays comprehensive interview scores
- Shows strengths and improvement areas
- Provides detailed AI-generated feedback
- Visual score cards with progress bars

**Route:** `/interview-results`

## How It Works

### 1. Interview Start
```typescript
// Frontend creates unique session ID
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initialize session with backend
POST /api/interview/start-session
{
  session_id: sessionId,
  user_id: 'user_123',
  interview_type: 'technical'
}
```

### 2. Conversation Capture
```typescript
// Listen for messages from Beyond Presence iframe
window.addEventListener('message', (event) => {
  if (event.origin.includes('bey.chat')) {
    const message = {
      speaker: event.data.speaker, // 'interviewer' or 'candidate'
      message: event.data.message,
      timestamp: new Date().toISOString()
    };
    
    // Send to backend
    POST /api/interview/add-message/{sessionId}
  }
});
```

### 3. Interview End & Scoring
```typescript
// When user clicks exit button
POST /api/interview/end-session/{sessionId}

// Backend uses Gemini AI to analyze conversation and generate:
{
  technical_score: 85,
  communication_score: 78,
  confidence_score: 82,
  problem_solving_score: 80,
  overall_score: 81.25,
  feedback_text: "Detailed AI feedback...",
  strengths: ["Strong technical knowledge", "Clear communication"],
  improvement_areas: ["Work on edge cases", "Practice system design"]
}
```

## AI Scoring System

### Gemini Integration
The system uses Google Gemini Pro to analyze interview conversations:

**Scoring Criteria:**
1. **Technical Score (0-100)**: Technical knowledge, accuracy, depth
2. **Communication Score (0-100)**: Clarity, articulation, structure
3. **Confidence Score (0-100)**: Confidence level, assertiveness
4. **Problem Solving Score (0-100)**: Analytical thinking, approach
5. **Overall Score (0-100)**: Weighted average of all scores

**AI Prompt Structure:**
```
You are an expert technical interviewer. Analyze the following interview conversation...

Interview Type: {type}
Duration: {seconds} seconds

Conversation:
interviewer: Hello, let's start with...
candidate: Thank you, I'm excited to...
...

Provide:
1. Technical Score (0-100)
2. Communication Score (0-100)
3. Confidence Score (0-100)
4. Problem Solving Score (0-100)
5. Overall Score (0-100)
6. Detailed Feedback
7. Strengths (3-5 items)
8. Improvement Areas (3-5 items)

Format as JSON...
```

## Data Flow

```
Beyond Presence Iframe
    ↓ (postMessage)
InterviewRoom Component
    ↓ (HTTP POST)
FastAPI Backend (/api/interview/add-message)
    ↓ (Store in memory)
In-Memory Session Storage
    ↓ (On interview end)
Gemini AI Service
    ↓ (Generate scores)
InterviewResults Page
    ↓ (Display to user)
User sees comprehensive feedback
```

## Configuration

### Environment Variables Required:
```bash
# .env file in test/backend/
GEMINI_API_KEY=your_gemini_api_key
```

### Backend Setup:
```bash
cd test/backend
source venv/bin/activate
pip install google-generativeai
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### Frontend Setup:
```bash
cd frontend_interview
npm install
npm start
```

## Storage

**Current Implementation:**
- In-memory storage (Python dictionary)
- Data persists only during server runtime

**Production Recommendations:**
1. Use PostgreSQL/MongoDB for persistent storage
2. Store in Django `InterviewSession` and `InterviewFeedback` models
3. Link sessions to user accounts
4. Enable historical analysis and progress tracking

## Integration with Django Backend

To integrate with existing Django models:

```python
# In Django backend
from interviews.models import InterviewSession, InterviewFeedback, InterviewResponse

# After getting scores from FastAPI
session = InterviewSession.objects.get(id=session_id)

# Save feedback
InterviewFeedback.objects.create(
    session=session,
    technical_score=scores['technical_score'],
    communication_score=scores['communication_score'],
    confidence_score=scores['confidence_score'],
    overall_score=scores['overall_score'],
    feedback_text=scores['feedback_text'],
    strengths='\n'.join(scores['strengths']),
    improvement_areas='\n'.join(scores['improvement_areas'])
)

# Save conversation
for msg in conversation:
    InterviewResponse.objects.create(
        session=session,
        question_text=msg['message'] if msg['speaker'] == 'interviewer' else '',
        response_text=msg['message'] if msg['speaker'] == 'candidate' else '',
        created_at=msg['timestamp']
    )
```

## Beyond Presence Message Format

The system expects messages from the Beyond Presence iframe in this format:

```javascript
{
  type: 'conversation' | 'transcript',
  speaker: 'interviewer' | 'candidate',
  message: 'The actual message text',
  timestamp: '2025-10-27T15:30:00Z'
}
```

**Note:** If Beyond Presence uses a different format, update the message handler in `InterviewRoom.tsx`:

```typescript
const message = {
  speaker: data.speaker || (data.role === 'agent' ? 'interviewer' : 'candidate'),
  message: data.message || data.text || '',
  timestamp: new Date().toISOString()
};
```

## Testing

### Test the Flow:
1. Start all servers (Django, FastAPI, React)
2. Navigate to Interview Sessions
3. Click "Start Session"
4. Conduct interview with Beyond Presence agent
5. Click exit button
6. View scores and feedback on Results page

### API Testing:
```bash
# Start session
curl -X POST http://localhost:8002/api/interview/start-session \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test123","user_id":"user1","interview_type":"technical"}'

# Add message
curl -X POST http://localhost:8002/api/interview/add-message/test123 \
  -H "Content-Type: application/json" \
  -d '{"speaker":"interviewer","message":"Hello","timestamp":"2025-10-27T15:30:00Z"}'

# End session and get scores
curl -X POST http://localhost:8002/api/interview/end-session/test123
```

## Future Enhancements

1. **Real-time Score Updates**: Show live feedback during interview
2. **Video Analysis**: Analyze facial expressions and body language
3. **Voice Analysis**: Evaluate tone, pace, and clarity
4. **Comparison Reports**: Compare performance across multiple interviews
5. **Custom Scoring Criteria**: Allow customization per interview type
6. **Export Reports**: PDF/CSV export of results
7. **Team Analytics**: Aggregate insights for hiring teams

## Troubleshooting

### Issue: No messages captured from iframe
- Check browser console for CORS errors
- Verify Beyond Presence iframe origin in message listener
- Ensure iframe has proper `allow` permissions

### Issue: Scoring fails
- Verify GEMINI_API_KEY is set correctly
- Check FastAPI logs for errors
- Ensure conversation has sufficient content

### Issue: Results page shows no data
- Check browser console for navigation errors
- Verify session ID is passed correctly
- Ensure backend returned scores successfully

## API Documentation

Full API documentation available at:
- FastAPI Docs: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc
