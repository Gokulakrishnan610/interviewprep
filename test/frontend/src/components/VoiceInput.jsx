import React, { useState } from 'react'
import { useDeepgramStream } from '../hooks/useDeepgramStream'
import { getGeminiResponse } from '../api/gemini'
import { sendToAvatar } from '../api/livekit'

const VoiceInput = ({ setMessages }) => {
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState('Click to start speaking')

  const handleTranscript = async (transcript) => {
    if (!transcript.trim()) return

    setStatus(`Heard: "${transcript}"`)
    
    // Add user message
    const userMessage = { sender: 'user', text: transcript, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])

    try {
      // Get Gemini response
      const reply = await getGeminiResponse(transcript)
      
      // Add bot message
      const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
      setMessages(prev => [...prev, botMessage])

      // Make avatar speak
      if (window.avatar) {
        await sendToAvatar('default', reply)
      }
      
      setStatus('Response received! Click to speak again.')
    } catch (error) {
      console.error('Error processing voice input:', error)
      setStatus('Error processing request. Click to try again.')
    }
  }

  const { startListening, stopListening } = useDeepgramStream(handleTranscript)

  const toggleListening = () => {
    if (isListening) {
      stopListening()
      setIsListening(false)
      setStatus('Click to start speaking')
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
      >
        {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Chat'}
      </button>
      <div className="status">{status}</div>
    </div>
  )
}

export default VoiceInput