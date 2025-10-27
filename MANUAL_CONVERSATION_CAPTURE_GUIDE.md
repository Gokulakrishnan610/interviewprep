# Manual Conversation Capture & Scoring Guide

## Overview
Since Beyond Presence doesn't automatically send conversation data via `postMessage`, this system provides **manual conversation capture** tools to extract conversations and generate AI-powered scores.

## 🎯 How It Works

### Step 1: Start Interview
1. Navigate to Interview Sessions
2. Click "Start Session"
3. The Beyond Presence agent loads in the interview room
4. A **green floating button (💬)** appears in the bottom-right corner

### Step 2: Capture Conversation

You have **3 options** to capture the conversation:

#### Option A: Manual Entry (Recommended for Real Interviews)
1. Click the **green 💬 button** to open the capture panel
2. During the interview, manually type each exchange:
   - Select **"Interviewer"** or **"Candidate"** from dropdown
   - Type the message in the text area
   - Click **"Add Message"**
3. Repeat for each question and answer
4. The panel shows: "Messages captured: X"

#### Option B: Test with Sample Conversation
1. Click the **green 💬 button**
2. Click **"Add Sample Conversation (Test)"**
3. A realistic 6-message interview conversation is automatically added
4. Use this to test the scoring system

#### Option C: Copy-Paste from Beyond Presence
1. After the interview ends, copy the conversation from Beyond Presence chat/transcript
2. Click the **green 💬 button**
3. Paste each message one by one with the correct speaker selected

### Step 3: End Interview & Get Scores
1. Click the **red exit button** (top right)
2. The system:
   - Sends all captured messages to backend
   - Uses **Google Gemini AI** to analyze the conversation
   - Generates comprehensive scores
   - Navigates to Results page

### Step 4: View Results
The results page shows:
- **Overall Score** (0-100)
- **4 Detailed Scores**:
  - Technical Skills
  - Communication
  - Confidence
  - Problem Solving
- **Strengths** (3-5 items)
- **Areas for Improvement** (3-5 items)
- **Detailed Feedback** (AI-generated paragraph)

## 🎨 UI Elements

### Floating Button (💬)
- **Location**: Bottom-right corner
- **Color**: Green
- **Action**: Opens conversation capture panel

### Capture Panel
- **Messages Counter**: Shows how many messages captured
- **Speaker Dropdown**: Select "Interviewer" or "Candidate"
- **Message Textarea**: Type the message
- **Add Message Button**: Saves message to backend
- **Add Sample Button**: Quick test with realistic conversation
- **Close Button**: Hides the panel

### Exit Button (Phone Icon)
- **Location**: Top-right corner
- **Color**: Red
- **Action**: Ends interview and generates scores

## 📊 Scoring System

### AI Analysis (Google Gemini)
The system analyzes:
- **Technical Knowledge**: Accuracy, depth, expertise
- **Communication**: Clarity, structure, articulation
- **Confidence**: Assertiveness, hesitation patterns
- **Problem Solving**: Analytical thinking, approach

### Score Ranges
- **80-100**: Excellent (Green)
- **60-79**: Good (Yellow)
- **0-59**: Needs Improvement (Red)

### Feedback Components
1. **Overall Score**: Weighted average of all metrics
2. **Individual Scores**: Detailed breakdown
3. **Strengths**: What you did well
4. **Improvement Areas**: What to work on
5. **Detailed Feedback**: Comprehensive analysis (2-3 paragraphs)

## 🔧 Technical Details

### Backend API Endpoints
```
POST /api/interview/start-session
- Initializes interview session
- Body: { session_id, user_id, interview_type }

POST /api/interview/add-message/{session_id}
- Adds conversation message
- Body: { speaker, message, timestamp }

POST /api/interview/end-session/{session_id}
- Ends interview and generates scores
- Returns: { success, session_id, scores }
```

### Frontend Functions
```typescript
addManualMessage()
- Captures single message
- Sends to backend immediately

addSampleConversation()
- Adds 6 realistic interview messages
- Perfect for testing

endCall()
- Triggers scoring
- Navigates to results page
```

## 🧪 Testing the System

### Quick Test (2 minutes)
1. Start an interview session
2. Click the **green 💬 button**
3. Click **"Add Sample Conversation (Test)"**
4. Wait 1 second for messages to load
5. Click the **red exit button**
6. View your AI-generated scores!

### Real Interview Test
1. Start interview with Beyond Presence
2. As the interview progresses, manually capture each exchange
3. Keep the capture panel open during the interview
4. After 5-10 exchanges, click exit
5. Review the detailed scores and feedback

## 📝 Example Workflow

```
1. User clicks "Start Session"
   ↓
2. Beyond Presence loads
   ↓
3. Interview begins
   ↓
4. User clicks 💬 button
   ↓
5. For each exchange:
   - Select speaker
   - Type message
   - Click "Add Message"
   ↓
6. Interview ends
   ↓
7. User clicks exit button
   ↓
8. Backend analyzes with Gemini AI
   ↓
9. Results page shows scores
```

## 🎯 Best Practices

### During Interview
- **Capture key exchanges**: Focus on important questions and answers
- **Be accurate**: Type messages as spoken
- **Don't rush**: Quality over quantity
- **Minimum 5-6 exchanges**: Needed for meaningful analysis

### For Best Scores
- **Technical interviews**: Capture technical discussions, problem-solving
- **Behavioral interviews**: Capture STAR method responses
- **Mixed interviews**: Balance technical and behavioral content

### Message Format
```
Interviewer: "Can you explain your approach to solving X?"
Candidate: "I would start by analyzing the requirements..."
```

## 🔍 Troubleshooting

### No Scores Generated
**Issue**: Clicked exit but no results page
**Solution**: 
- Check browser console for errors
- Ensure at least 1 message was captured
- Verify FastAPI server is running on port 8002

### Default Scores Shown
**Issue**: Scores are generic (70-75 range)
**Cause**: 
- No conversation captured
- Gemini API key not configured
- API error occurred
**Solution**:
- Add more conversation messages
- Check GEMINI_API_KEY in backend .env file
- Review backend logs

### Messages Not Saving
**Issue**: "Add Message" doesn't work
**Solution**:
- Check browser console for errors
- Verify backend is running
- Check network tab for failed requests

## 🚀 Future Enhancements

### Automatic Capture (If Beyond Presence Adds Support)
If Beyond Presence starts sending `postMessage` events:
- The system already listens for them
- Check browser console for: "📨 Received message"
- Messages will be captured automatically

### Integration Options
1. **Speech-to-Text**: Auto-transcribe audio
2. **Screen Recording**: Extract conversation from video
3. **Beyond Presence API**: Direct integration if available
4. **Browser Extension**: Auto-capture from DOM

## 📞 Support

### Check Logs
**Browser Console**:
```
📝 Interview session started: session_xxxxx
💬 Captured message: { speaker: "...", message: "..." }
✅ Message sent to backend
🏁 Ending interview session
```

**Backend Terminal**:
```
📝 Starting interview session: session_xxxxx
💬 Adding message to session_xxxxx
🤖 Analyzing conversation with Gemini AI...
✅ Scores generated
```

### Common Issues
1. **404 errors**: Router not loaded - restart FastAPI server
2. **CORS errors**: Check ALLOWED_ORIGINS in backend config
3. **No Gemini response**: Verify API key and quota

## 🎓 Sample Conversation Template

Use this template for manual entry:

```
Interviewer: Hello! Thank you for joining us today. Can you tell me about yourself?
Candidate: [Your response]

Interviewer: What interests you about this role?
Candidate: [Your response]

Interviewer: Can you describe a challenging project you've worked on?
Candidate: [Your response]

Interviewer: How do you handle tight deadlines?
Candidate: [Your response]

Interviewer: Do you have any questions for us?
Candidate: [Your response]
```

## ✅ Success Checklist

Before ending interview, ensure:
- [ ] At least 5-6 message exchanges captured
- [ ] Both interviewer and candidate messages included
- [ ] Messages are clear and complete
- [ ] "Messages captured: X" shows correct count
- [ ] Backend server is running
- [ ] GEMINI_API_KEY is configured

Then click exit and enjoy your AI-powered feedback! 🎉
