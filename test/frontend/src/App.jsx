import React, { useState, useEffect } from 'react'
import Avatar from './components/Avatar'
import ChatFlow from './components/ChatFlow'
import VoiceInput from './components/VoiceInput'
import { Mic, Video, MessageCircle, User } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState('lobby')
  const [interviewPosition, setInterviewPosition] = useState('Software Engineer')
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')

  const startInterview = () => {
    if (!roomName || !userName) {
      alert('Please enter room name and your name')
      return
    }
    setCurrentView('interview')
  }

  if (currentView === 'lobby') {
    return (
      <div className="app lobby">
        <div className="lobby-container">
          <h1>AI Avatar Interview Room</h1>
          <p>Practice your interview skills with our AI interviewer</p>
          
          <div className="input-group">
            <label>
              <User size={16} />
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="input-group">
            <label>
              <Video size={16} />
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
            />
          </div>

          <div className="input-group">
            <label>
              <MessageCircle size={16} />
              Interview Position
            </label>
            <select
              value={interviewPosition}
              onChange={(e) => setInterviewPosition(e.target.value)}
            >
              <option value="Software Engineer">Software Engineer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="Product Manager">Product Manager</option>
            </select>
          </div>

          <button className="start-button" onClick={startInterview}>
            Start Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app interview-room">
      <header className="app-header">
        <h1>AI Interview - {interviewPosition}</h1>
        <div className="user-info">
          <span>Welcome, {userName}</span>
          <button 
            className="leave-button"
            onClick={() => setCurrentView('lobby')}
          >
            Leave Interview
          </button>
        </div>
      </header>

      <div className="interview-container">
        <div className="avatar-section">
          <Avatar 
            roomName={roomName}
            userName={userName}
            interviewPosition={interviewPosition}
          />
        </div>
        
        <div className="chat-section">
          <ChatFlow />
        </div>

        <div className="voice-section">
          <VoiceInput />
        </div>
      </div>
    </div>
  )
}

export default App