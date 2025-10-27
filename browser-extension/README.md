# Beyond Presence Conversation Extractor - Browser Extension

## 🎯 Purpose
This Chrome/Firefox extension automatically extracts conversation data from Beyond Presence interviews and sends it to your React application for AI scoring.

## ✨ Features
- **Automatic extraction** - No manual typing required
- **Real-time monitoring** - Captures messages as they appear
- **CORS bypass** - Can access iframe content that web apps cannot
- **Duplicate prevention** - Smart filtering to avoid repeated messages
- **Multiple detection methods** - MutationObserver + polling for reliability

## 📦 Installation

### Chrome

1. **Open Extension Management**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `browser-extension` folder
   - Extension icon should appear in toolbar

4. **Verify Installation**
   - Open browser console (F12)
   - You should see: "✅ Parent Listener ready"

### Firefox

1. **Open Debugging Page**
   ```
   about:debugging#/runtime/this-firefox
   ```

2. **Load Temporary Add-on**
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from `browser-extension` folder

3. **Verify Installation**
   - Extension should appear in the list
   - Check browser console for confirmation messages

## 🚀 Usage

### Automatic Mode (Recommended)

1. **Start Interview**
   - Navigate to your React app (localhost:3000)
   - Go to Interview Sessions
   - Click "Start Session"

2. **Extension Activates**
   - Extension automatically detects Beyond Presence iframe
   - Starts monitoring for conversation
   - Console shows: "🔌 Beyond Presence Extractor loaded"

3. **Conversation Captured**
   - As you talk with the AI interviewer, messages are extracted
   - Console shows: "💬 Extracted message #X"
   - Data automatically sent to your React app
   - React app sends to backend for storage

4. **End Interview**
   - Click the red exit button
   - AI generates scores based on captured conversation
   - View comprehensive results

### Manual Trigger

If automatic extraction doesn't work, you can manually trigger it:

1. **Open Browser Console** (F12)

2. **Run Command**
   ```javascript
   window.requestConversationExtraction()
   ```

3. **Check Results**
   ```javascript
   // View captured messages
   JSON.parse(sessionStorage.getItem('beyondPresenceMessages'))
   ```

## 🔍 How It Works

### Architecture

```
Beyond Presence Iframe (bey.chat)
    ↓
Browser Extension (Content Script)
    ↓ (postMessage)
React App (localhost:3000)
    ↓ (HTTP POST)
FastAPI Backend (localhost:8002)
    ↓ (AI Analysis)
Gemini AI
    ↓ (Scores)
Results Page
```

### Detection Methods

1. **DOM Selectors**
   - Searches for common chat UI patterns
   - `.message`, `.chat-message`, `[role="log"]`, etc.

2. **MutationObserver**
   - Monitors DOM changes in real-time
   - Captures new messages as they appear

3. **Polling Fallback**
   - Checks every 2 seconds for new content
   - Ensures nothing is missed

4. **Speaker Detection**
   - Identifies interviewer vs candidate
   - Uses class names, data attributes, and content analysis

## 🐛 Troubleshooting

### Extension Not Loading

**Problem**: Extension doesn't appear in toolbar

**Solutions**:
1. Check Developer Mode is enabled
2. Reload extension: `chrome://extensions/` → Click reload icon
3. Check console for errors
4. Verify all files are in the folder

### No Messages Captured

**Problem**: Console shows "⚠️ No messages found yet"

**Solutions**:
1. Wait 2-3 seconds after page loads
2. Manually trigger: `window.requestConversationExtraction()`
3. Check Beyond Presence UI structure changed
4. Open DevTools and inspect Beyond Presence iframe

### Messages Not Reaching React App

**Problem**: Extension captures messages but React doesn't receive them

**Solutions**:
1. Check browser console for "📨 Received message" logs
2. Verify `parentListener.js` is loaded
3. Check CORS settings
4. Ensure React app is on localhost:3000

### Duplicate Messages

**Problem**: Same message captured multiple times

**Solution**: Extension has built-in duplicate prevention, but if it persists:
1. Clear sessionStorage: `sessionStorage.clear()`
2. Reload page
3. Check if multiple instances of extension are running

## 📊 Console Messages

### Success Messages
```
✅ Beyond Presence Extractor ready
💬 Extracted message #1: interviewer - Hello...
📤 Sent 3 messages to parent window
🎉 Received conversation from browser extension!
✅ All messages processed
```

### Warning Messages
```
⚠️ No messages found yet, will monitor for changes
⚠️ Beyond Presence iframe not found
```

### Error Messages
```
❌ Direct iframe access failed (expected due to CORS)
❌ Error sending messages to parent
```

## 🔧 Customization

### Adjust Selectors

If Beyond Presence changes their UI, update selectors in `beyondPresenceExtractor.js`:

```javascript
messageSelectors: [
  '.your-custom-selector',
  '[data-your-attribute]',
  // Add more selectors
]
```

### Change Polling Interval

```javascript
pollingInterval: 2000  // Change to 1000 for faster polling
```

### Modify Speaker Detection

```javascript
function isAgentMessage(element) {
  // Add your custom logic
  if (element.classList.contains('your-agent-class')) {
    return true;
  }
  return false;
}
```

## 📝 Development

### File Structure
```
browser-extension/
├── manifest.json              # Extension configuration
├── beyondPresenceExtractor.js # Runs in Beyond Presence iframe
├── parentListener.js          # Runs in React app
├── popup.html                 # Extension popup (optional)
├── icon16.png                 # Extension icons
├── icon48.png
├── icon128.png
└── README.md                  # This file
```

### Testing

1. **Test in Isolation**
   ```javascript
   // In Beyond Presence iframe console
   console.log(document.querySelectorAll('.message'))
   ```

2. **Test Communication**
   ```javascript
   // In React app console
   window.addEventListener('message', e => console.log(e.data))
   ```

3. **Test Backend**
   ```bash
   curl -X POST http://localhost:8002/api/interview/start-session \
     -H "Content-Type: application/json" \
     -d '{"session_id":"test","user_id":"user1","interview_type":"technical"}'
   ```

## 🎨 Adding Icons

Create simple icons or use these emoji-based ones:

```html
<!-- icon16.png, icon48.png, icon128.png -->
<!-- Use any image editor to create PNG files with 💬 emoji -->
```

Or download free icons from:
- https://www.flaticon.com/
- https://icons8.com/
- https://www.iconfinder.com/

## 🔐 Privacy & Security

- Extension only runs on `bey.chat` and `localhost:3000`
- No data sent to external servers
- All conversation data stays local
- Only sends to your own backend (localhost:8002)

## 📄 License

MIT License - Feel free to modify and use

## 🤝 Contributing

If you improve the selectors or detection methods:
1. Test thoroughly
2. Document changes
3. Share improvements

## 📞 Support

### Check Extension Status
```javascript
// In React app console
window.requestConversationExtraction()
```

### View Captured Data
```javascript
JSON.parse(sessionStorage.getItem('beyondPresenceMessages'))
```

### Clear and Restart
```javascript
sessionStorage.clear()
location.reload()
```

## 🎯 Next Steps

After installation:
1. Test with sample conversation first
2. Try a real interview
3. Adjust selectors if needed
4. Enjoy automatic conversation capture! 🎉
