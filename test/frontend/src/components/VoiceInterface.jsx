import React, { useState, useEffect } from 'react'
import { getGeminiResponse } from '../api/gemini'

const VoiceInterface = ({ setMessages }) => {
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState('Ready to start conversation')
  const [isBeyondPresenceReady, setIsBeyondPresenceReady] = useState(false)

  useEffect(() => {
    // Check if Beyond Presence is ready
    const checkBeyondPresence = () => {
      if (window.beyondPresenceAvatar) {
        setIsBeyondPresenceReady(true)
        setStatus('Beyond Presence Ready - Click to speak')
      } else {
        // Check again after a delay
        setTimeout(checkBeyondPresence, 1000)
      }
    }

    checkBeyondPresence()
  }, [])

  const speakWithBeyondPresence = async (text) => {
    try {
      if (!window.beyondPresenceAvatar) {
        throw new Error('Beyond Presence avatar not available')
      }

      // Get LiveKit token for Beyond Presence
      const tokenRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/livekit/token`)
      const tokenData = await tokenRes.json()

      if (!tokenData.success) {
        throw new Error('Failed to get LiveKit token')
      }

      // Send speak request to backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/avatar/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_id: 'default',
          text: text,
          livekit_token: tokenData.token
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.detail || 'Failed to make avatar speak')
      }

      console.log('✅ Beyond Presence speaking:', text)
      return true

    } catch (error) {
      console.error('❌ Beyond Presence speak error:', error)
      
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        window.speechSynthesis.speak(utterance)
        return true
      }
      
      return false
    }
  }

  const handleVoiceInput = async (transcript) => {
    if (!transcript.trim()) return

    setStatus(`You said: "${transcript}"`)
    
    // Add user message to chat
    const userMessage = { sender: 'user', text: transcript, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])

    try {
      setStatus('Thinking...')
      
      // Get Gemini response
      const reply = await getGeminiResponse(transcript)
      
      // Add bot message to chat
      const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
      setMessages(prev => [...prev, botMessage])

      // Speak the response using Beyond Presence
      setStatus('Speaking...')
      await speakWithBeyondPresence(reply)
      
      setStatus('Ready - Click to speak again')
      
    } catch (error) {
      console.error('Error processing voice input:', error)
      setStatus('Error - Click to try again')
      
      const errorMessage = { 
        sender: 'bot', 
        text: 'Sorry, I encountered an error. Please try again.', 
        timestamp: new Date(),
        isError: true 
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Mock voice input for demonstration (replace with real voice input)
  const startMockListening = () => {
    if (isListening) return

    setIsListening(true)
    setStatus('Listening... (Mock mode)')
    
    // Simulate voice input after 2 seconds
    setTimeout(() => {
      const mockTranscript = "Hello, how are you today?"
      handleVoiceInput(mockTranscript)
      setIsListening(false)
    }, 2000)
  }

  return (
    <div className="voice-interface">
      <button 
        className={`voice-btn ${isListening ? 'listening' : ''} ${!isBeyondPresenceReady ? 'disabled' : ''}`}
        onClick={startMockListening}
        disabled={!isBeyondPresenceReady || isListening}
      >
        {isListening ? '🛑 Listening...' : '🎤 Start Conversation'}
        {!isBeyondPresenceReady && ' (Loading...)'}
      </button>
      
      <div className="status">
        {status}
      </div>
      
      <div style={{ 
        marginTop: '10px',
        padding: '10px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '5px',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isBeyondPresenceReady ? '#00ff88' : '#ffaa00',
            animation: isBeyondPresenceReady ? 'pulse 2s infinite' : 'none'
          }}></div>
          {isBeyondPresenceReady ? 'Beyond Presence Connected' : 'Connecting to Beyond Presence...'}
        </div>
        
        {!isBeyondPresenceReady && (
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
            Ensure you have a valid BEYOND_PRESENCE_API_KEY in backend/.env
          </div>
        )}
      </div>
    </div>
  )
}

export default VoiceInterface