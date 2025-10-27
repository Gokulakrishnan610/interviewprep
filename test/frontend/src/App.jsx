import React, { useState } from 'react'
import Avatar from './components/Avatar'
import ChatFlow from './components/ChatFlow'
import VoiceInput from './components/VoiceInput'
import './styles/App.css'

function App() {
  const [messages, setMessages] = useState([])

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 AI Avatar Assistant</h1>
        <p>Powered by Beyond Presence + Gemini + Deepgram + LiveKit</p>
      </header>

      <div className="app-content">
        <div className="avatar-section">
          <Avatar />
        </div>
        
        <div className="chat-section">
          <ChatFlow messages={messages} setMessages={setMessages} />
          <VoiceInput setMessages={setMessages} />
        </div>
      </div>
    </div>
  )
}

export default App