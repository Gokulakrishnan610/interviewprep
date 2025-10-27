// import React, { useState } from 'react'
// import { useDeepgramStream } from '../hooks/useDeepgramStream'
// import { getGeminiResponse } from '../api/gemini'

// const VoiceInput = ({ setMessages }) => {
//   const [isListening, setIsListening] = useState(false)
//   const [status, setStatus] = useState('Click microphone to start speaking')
//   const [lastTranscript, setLastTranscript] = useState('')

//   const handleTranscript = async (transcript) => {
//     if (!transcript.trim() || transcript === lastTranscript) return

//     setLastTranscript(transcript)
//     setStatus(`Heard: "${transcript}"`)
    
//     // Add user message
//     const userMessage = { sender: 'user', text: transcript, timestamp: new Date() }
//     setMessages(prev => [...prev, userMessage])

//     try {
//       setStatus('Thinking...')
      
//       // Get Gemini response
//       const reply = await getGeminiResponse(transcript)
      
//       // Add bot message
//       const botMessage = { sender: 'bot', text: reply, timestamp: new Date() }
//       setMessages(prev => [...prev, botMessage])

//       // Make avatar speak
//       if (window.avatar) {
//         await window.avatar.speak(reply)
//       }
      
//       setStatus('Response received! Click to speak again.')
//       setLastTranscript('') // Reset for next interaction
//     } catch (error) {
//       console.error('Error processing voice input:', error)
//       setStatus('Error processing request. Click to try again.')
      
//       // Add error message to chat
//       const errorMessage = { 
//         sender: 'bot', 
//         text: 'Sorry, I encountered an error processing your request. Please try again.', 
//         timestamp: new Date(),
//         isError: true 
//       }
//       setMessages(prev => [...prev, errorMessage])
//     }
//   }

//   const { startListening, stopListening, isListening: deepgramListening, error } = useDeepgramStream(handleTranscript)

//   const toggleListening = () => {
//     if (isListening) {
//       stopListening()
//       setIsListening(false)
//       setStatus('Click microphone to start speaking')
//       setLastTranscript('')
//     } else {
//       startListening()
//       setIsListening(true)
//       setStatus('Listening... Speak now!')
//     }
//   }

//   return (
//     <div className="voice-controls">
//       <button 
//         className={`voice-btn ${isListening ? 'listening' : ''}`}
//         onClick={toggleListening}
//         disabled={!!error && !isListening}
//       >
//         {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Chat'}
//       </button>
//       <div className="status">
//         {error ? (
//           <span style={{ color: '#ff6b6b' }}>
//             {error} - Use text chat instead
//           </span>
//         ) : (
//           status
//         )}
//       </div>
//       {error && (
//         <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
//           Make sure the backend is running on port 8000
//         </div>
//       )}
//     </div>
//   )
// }

// export default VoiceInput
import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'

const VoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const websocketRef = useRef(null)

  useEffect(() => {
    // Check if browser supports MediaRecorder
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
      return
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      // Initialize WebSocket connection for Deepgram
      const ws = new WebSocket('ws://localhost:8000/api/deepgram/transcribe')
      websocketRef.current = ws

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'transcription' && data.text) {
          setTranscript(prev => prev + ' ' + data.text)
        }
      }

      ws.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }

        mediaRecorder.start(100) // Send data every 100ms
        setIsRecording(true)
      }

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    if (websocketRef.current) {
      websocketRef.current.close()
    }
    
    setIsRecording(false)
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      setTranscript('')
      startRecording()
    }
  }

  if (!isSupported) {
    return (
      <div className="voice-input unsupported">
        <p>Voice input is not supported in your browser.</p>
        <p>Please use Chrome, Firefox, or Edge.</p>
      </div>
    )
  }

  return (
    <div className="voice-input">
      <div className="voice-header">
        <h3>Voice Input</h3>
        <div className={`recording-status ${isRecording ? 'recording' : ''}`}>
          {isRecording ? 'Recording...' : 'Ready'}
        </div>
      </div>

      <div className="recording-controls">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleRecording}
        >
          {isRecording ? <Square size={24} /> : <Mic size={24} />}
          {isRecording ? 'Stop' : 'Start Speaking'}
        </button>
      </div>

      <div className="transcript-container">
        <label>Live Transcript:</label>
        <div className="transcript-text">
          {transcript || 'Speak to see transcript here...'}
        </div>
      </div>

      <div className="voice-info">
        <p>Click the button above to start speaking. Your speech will be transcribed in real-time.</p>
      </div>
    </div>
  )
}

export default VoiceInput