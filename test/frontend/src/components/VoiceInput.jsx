import React, { useState } from 'react'
import { useDeepgramStream } from '../hooks/useDeepgramStream'
import { getGeminiResponse } from '../api/gemini'

const VoiceInput = ({ setMessages }) => {
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState('Click microphone to start speaking')
  const [lastTranscript, setLastTranscript] = useState('')

  const handleTranscript = async (transcript) => {
    if (!transcript.trim() || transcript === lastTranscript) return

    setLastTranscript(transcript)
    setStatus(`Heard: "${transcript}"`)
    
    // Add user message
    const userMessage = { sender: 'user', text: transcript, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])

    try {
      setStatus('Thinking...')
      
      // Get Gemini response
      const reply = await getGeminiResponse(transcript)
      
      // Add bot message
      const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
      setMessages(prev => [...prev, botMessage])

      // Make avatar speak
      if (window.avatar) {
        await window.avatar.speak(reply)
      }
      
      setStatus('Response received! Click to speak again.')
      setLastTranscript('') // Reset for next interaction
    } catch (error) {
      console.error('Error processing voice input:', error)
      setStatus('Error processing request. Click to try again.')
      
      // Add error message to chat
      const errorMessage = { 
        sender: 'bot', 
        text: 'Sorry, I encountered an error processing your request. Please try again.', 
        timestamp: new Date(),
        isError: true 
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const { startListening, stopListening, isListening: deepgramListening, error } = useDeepgramStream(handleTranscript)

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      setIsListening(false)
      setStatus('Click microphone to start speaking')
      setLastTranscript('')
    } else {
      startListening()
      setIsListening(true)
      setStatus('Listening... Speak now!')
    }
  }

  return (
    <div className="voice-controls">
      <button 
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        disabled={!!error && !isListening}
      >
        {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Chat'}
      </button>
      <div className="status">
        {error ? (
          <span style={{ color: '#ff6b6b' }}>
            {error} - Use text chat instead
          </span>
        ) : (
          status
        )}
      </div>
      {error && (
        <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
          Make sure the backend is running on port 8000
        </div>
      )}
    </div>
  )
}

export default VoiceInput