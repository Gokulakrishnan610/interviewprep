# Automatic Conversation Extraction from Beyond Presence

## 🎯 Solution Overview

Since Beyond Presence doesn't expose conversation data via API or `postMessage`, I've created a **Browser Extension** that can access the iframe content and automatically extract conversations.

## 🔧 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Beyond Presence Iframe (bey.chat)                          │
│  - Conversation happens here                                 │
│  - CORS protected (web apps can't access)                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Browser Extension
                 │ (Can bypass CORS)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Content Script (beyondPresenceExtractor.js)                │
│  - Monitors DOM for new messages                            │
│  - Extracts conversation in real-time                       │
│  - Identifies speaker (interviewer/candidate)               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ postMessage
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  React App (localhost:3000)                                 │
│  - Receives extracted messages                              │
│  - Displays message counter                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP POST
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend (localhost:8002)                           │
│  - Stores conversation                                      │
│  - Generates AI scores with Gemini                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ AI Analysis
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Results Page                                               │
│  - Shows comprehensive scores                               │
│  - Displays feedback and recommendations                    │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Installation Steps

### Step 1: Install Browser Extension

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle switch in top-right corner

3. **Load Extension**
   - Click "Load unpacked"
   - Navigate to: `/Users/kirthika/Documents/nlp-v2v-main/project/browser-extension`
   - Click "Select"

4. **Verify Installation**
   - Extension icon (💬) should appear in toolbar
   - Open browser console (F12)
   - You should see: "✅ Parent Listener ready"

### Step 2: Test the Extension

1. **Start Interview**
   - Go to http://localhost:3000
   - Navigate to Interview Sessions
   - Click "Start Session"

2. **Check Console**
   - Open DevTools (F12)
   - Console tab
   - Look for:
     ```
     🔌 Beyond Presence Extractor loaded
     👂 Listening for messages from Beyond Presence iframe and browser extension
     ```

3. **Test with Sample**
   - Click the green 💬 button (bottom-right)
   - Click "Add Sample Conversation (Test)"
   - Should see 6 messages added
   - Click red exit button
   - View AI-generated scores!

### Step 3: Use in Real Interview

1. **Start Interview Session**
   - The extension automatically activates
   - Console shows: "🔍 Attempting initial extraction..."

2. **Conduct Interview**
   - Talk with Beyond Presence AI
   - Extension monitors for new messages
   - Console shows: "💬 Extracted message #X"
   - Messages automatically sent to backend

3. **End Interview**
   - Click red exit button
   - AI analyzes conversation
   - View comprehensive results

## 🎨 UI Features

### Floating Conversation Panel (💬 Button)

**Location**: Bottom-right corner

**Features**:
- Shows message count: "Messages captured: X"
- Manual message entry (backup option)
- Sample conversation button (for testing)
- Real-time updates as extension captures messages

### Message Counter

The panel automatically updates as the browser extension captures messages:
```
Messages captured: 0  →  Messages captured: 3  →  Messages captured: 8
```

## 🔍 Troubleshooting

### Extension Not Capturing Messages

**Check 1: Extension Loaded**
```
chrome://extensions/
```
- Verify extension is enabled
- Check for errors

**Check 2: Console Logs**
Open DevTools (F12) and look for:
```
✅ Beyond Presence Extractor ready
🔍 Attempting initial extraction...
```

If you see:
```
⚠️ No messages found yet, will monitor for changes
```
This is normal - extension is waiting for messages to appear.

**Check 3: Manual Trigger**
In browser console, run:
```javascript
window.requestConversationExtraction()
```

**Check 4: Beyond Presence UI Changed**
If Beyond Presence updated their UI:
1. Open `browser-extension/beyondPresenceExtractor.js`
2. Update selectors in `CONFIG.messageSelectors`
3. Reload extension

### Messages Not Reaching Backend

**Check Backend Running**
```bash
# Should show: INFO: Application startup complete
# Terminal with FastAPI server
```

**Check API Endpoint**
```bash
curl http://localhost:8002/api/interview/health
```

Should return:
```json
{
  "status": "available",
  "active_sessions": 0,
  "gemini_available": true
}
```

**Check Network Tab**
- Open DevTools → Network tab
- Filter: "interview"
- Should see POST requests to `/api/interview/add-message/`

### No Scores Generated

**Possible Causes**:
1. No conversation captured
2. Gemini API key not configured
3. Backend error

**Solutions**:
1. Check message count > 0
2. Verify `GEMINI_API_KEY` in backend `.env`
3. Check backend logs for errors

## 📊 What You'll See

### Browser Console (Success)
```
🔌 Beyond Presence Extractor loaded
📍 Current URL: https://bey.chat/bbe33449-03e7-43ae-b6d5-5c8bf138f52a
🔍 Attempting initial extraction...
✅ Found 2 elements with selector: .message
💬 Extracted message #1: interviewer - Hello! Thank you for...
💬 Extracted message #2: candidate - Hi! Thank you for having me...
📤 Sent 2 messages to parent window
🎉 Received conversation from browser extension!
   Messages: 2
✅ All messages processed
```

### Backend Terminal (Success)
```
📝 Starting interview session: session_1234567890_abc123
💬 Adding message to session_1234567890_abc123: interviewer - Hello...
💬 Adding message to session_1234567890_abc123: candidate - Hi...
🏁 Ending interview session: session_1234567890_abc123
   Duration: 180 seconds
   Messages: 6
🤖 Analyzing conversation with Gemini AI...
   Conversation length: 1234 characters
📊 Gemini response received: 567 characters
✅ Scores parsed successfully
✅ Scores generated for session_1234567890_abc123
```

## 🎯 Three Ways to Capture Conversation

### 1. Automatic (Browser Extension) ⭐ RECOMMENDED
- **How**: Install extension, start interview
- **Pros**: Fully automatic, real-time, no effort
- **Cons**: Requires extension installation
- **Best for**: Production use, real interviews

### 2. Manual Entry (Fallback)
- **How**: Click 💬 button, type each message
- **Pros**: Works without extension, full control
- **Cons**: Time-consuming, manual effort
- **Best for**: Testing, when extension fails

### 3. Sample Conversation (Testing)
- **How**: Click 💬 button → "Add Sample Conversation"
- **Pros**: Instant, realistic data
- **Cons**: Not real interview data
- **Best for**: Testing the scoring system

## 🔐 Privacy & Security

- Extension only runs on `bey.chat` and `localhost:3000`
- No external servers involved
- All data stays on your machine
- Only sends to your own backend (localhost:8002)
- No tracking, no analytics, no data collection

## 📈 Expected Results

### Typical Interview Flow

1. **Start**: 0 messages captured
2. **After 2 min**: 3-5 messages captured
3. **After 5 min**: 8-12 messages captured
4. **After 10 min**: 15-20 messages captured
5. **End**: Click exit → AI generates scores

### Score Ranges

- **80-100**: Excellent performance (Green)
- **60-79**: Good performance (Yellow)
- **0-59**: Needs improvement (Red)

### Feedback Includes

- Overall score
- 4 detailed metrics (Technical, Communication, Confidence, Problem Solving)
- 3-5 strengths
- 3-5 improvement areas
- 2-3 paragraphs of detailed feedback

## 🚀 Advanced Usage

### Check Extension Status
```javascript
// In browser console
chrome.storage.local.get(['messageCount', 'lastUpdate'], console.log)
```

### View Captured Messages
```javascript
JSON.parse(sessionStorage.getItem('beyondPresenceMessages'))
```

### Manually Trigger Extraction
```javascript
window.requestConversationExtraction()
```

### Clear All Data
```javascript
sessionStorage.clear()
chrome.storage.local.clear()
```

## 🎓 Tips for Best Results

### During Interview

1. **Speak clearly** - Better transcription
2. **Give detailed answers** - More content to analyze
3. **Show your thought process** - Demonstrates problem-solving
4. **Ask questions** - Shows engagement

### For High Scores

1. **Technical interviews**: Explain your approach, mention technologies
2. **Behavioral interviews**: Use STAR method (Situation, Task, Action, Result)
3. **Problem-solving**: Think aloud, discuss trade-offs
4. **Communication**: Be clear, structured, and concise

### Minimum Requirements

- **At least 5-6 message exchanges** for meaningful analysis
- **Mix of questions and answers**
- **Substantive responses** (not just "yes" or "no")

## 📞 Support

### If Extension Doesn't Work

1. **Check browser compatibility**: Chrome/Edge recommended
2. **Try Firefox**: Use `about:debugging` to load
3. **Use manual entry**: Click 💬 button as fallback
4. **Contact Beyond Presence**: Ask for API access

### If Scoring Fails

1. **Check Gemini API key**: Backend `.env` file
2. **Verify conversation captured**: Check message count > 0
3. **Review backend logs**: Look for errors
4. **Try sample conversation**: Test the system

## ✅ Success Checklist

Before ending interview:
- [ ] Extension installed and enabled
- [ ] Console shows "Beyond Presence Extractor loaded"
- [ ] Message count > 5
- [ ] Backend server running (port 8002)
- [ ] GEMINI_API_KEY configured
- [ ] No errors in console

Then click exit and enjoy your AI-powered feedback! 🎉

## 🔄 Updates

If Beyond Presence changes their UI:
1. Open `beyondPresenceExtractor.js`
2. Update `CONFIG.messageSelectors`
3. Reload extension
4. Test extraction

## 📝 Summary

**You now have 3 solutions**:

1. ✅ **Browser Extension** (Automatic) - Best option
2. ✅ **Manual Entry** (Fallback) - Always works
3. ✅ **Sample Conversation** (Testing) - Quick validation

All three methods work with the same backend and scoring system!
