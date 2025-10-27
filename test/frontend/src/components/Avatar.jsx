import React, { useEffect, useRef, useState } from 'react'
import { connectLiveKit } from '../api/livekit'

const Avatar = () => {
  const avatarRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [isBeyondPresenceLoaded, setIsBeyondPresenceLoaded] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

  // Enhanced TTS function that actually speaks
  const speakWithTTS = (text) => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported')
        resolve(false)
        return
      }

      // Stop any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Get available voices and try to find a good one
      const voices = window.speechSynthesis.getVoices()
      const preferredVoices = voices.filter(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Alex') || voice.name.includes('Karen'))
      )
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0]
        console.log('Using voice:', preferredVoices[0].name)
      }

      // Configure speech
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        console.log('TTS started speaking:', text)
      }

      utterance.onend = () => {
        console.log('TTS finished speaking')
        resolve(true)
      }

      utterance.onerror = (event) => {
        console.error('TTS error:', event.error)
        resolve(false)
      }

      // Speak the text
      try {
        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Failed to speak:', error)
        resolve(false)
      }
    })
  }

  // Handle user interaction for audio autoplay
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true)
      console.log('User interaction detected - audio should work now')
      
      // Test TTS with a welcome message on first interaction
      setTimeout(() => {
        if (window.avatar && userInteracted) {
          window.avatar.speak("Welcome to AI Avatar Assistant! Click the microphone to start talking.")
        }
      }, 1000)
    }
  }

  useEffect(() => {
    let mounted = true

    // Add event listeners for user interaction
    const events = ['click', 'touchstart', 'keydown']
    const interactionHandler = () => handleUserInteraction()
    
    events.forEach(event => {
      document.addEventListener(event, interactionHandler, { once: true })
    })

    // Check if Beyond Presence SDK is loaded
    const checkBeyondPresence = () => {
      if (window.BeyondPresence && typeof window.BeyondPresence.Avatar === 'function') {
        console.log('Beyond Presence SDK is available')
        setIsBeyondPresenceLoaded(true)
        return true
      }
      return false
    }

    // Listen for SDK load event
    const bpLoadHandler = () => {
      if (mounted) {
        setIsBeyondPresenceLoaded(true)
      }
    }
    window.addEventListener('beyondPresenceLoaded', bpLoadHandler)

    async function initializeAvatar() {
      if (!mounted) return
      
      try {
        setConnectionError(null)
        
        console.log('Initializing avatar...')
        
        // Get Beyond Presence token
        const tokenRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/avatar/token`)
        const tokenData = await tokenRes.json()
        
        if (!tokenData.success) {
          console.warn('Failed to get avatar token:', tokenData.error)
        }

        // Connect to LiveKit (will use mock if not configured)
        console.log('Connecting to LiveKit...')
        const livekitRoom = await connectLiveKit()
        console.log('LiveKit connection established')
        
        // Check if Beyond Presence SDK is available
        const bpLoaded = checkBeyondPresence()
        
        if (bpLoaded) {
          console.log('Beyond Presence SDK found, initializing avatar...')
          
          try {
            const avatar = new window.BeyondPresence.Avatar({
              container: avatarRef.current,
              token: tokenData.access_token || 'mock-token',
              livekit: {
                room: livekitRoom,
              },
              style: {
                width: '100%',
                height: '100%',
                background: '#000',
                borderRadius: '1rem',
              },
            })

            await avatar.start()
            window.avatar = avatar
            setIsConnected(true)
            
            console.log('Beyond Presence Avatar initialized successfully')
          } catch (bpError) {
            console.error('Beyond Presence initialization failed:', bpError)
            createFallbackAvatar()
          }
        } else {
          console.log('Beyond Presence SDK not available, using fallback avatar')
          createFallbackAvatar()
        }

      } catch (error) {
        if (!mounted) return
        console.error('Failed to initialize avatar:', error)
        setConnectionError(`Initialization failed: ${error.message}`)
        createFallbackAvatar()
      }
    }

    function createFallbackAvatar() {
      // Create a mock avatar for development that actually speaks
      const mockAvatar = {
        speak: async (text) => {
          console.log('Fallback avatar speaking:', text)
          const success = await speakWithTTS(text)
          if (!success) {
            console.warn('TTS failed, text would be:', text)
          }
          return Promise.resolve()
        },
        destroy: () => {
          console.log('Fallback avatar destroyed')
          window.speechSynthesis.cancel()
        }
      }
      
      window.avatar = mockAvatar
      setIsConnected(true)
      
      // Show a nice placeholder with click-to-speak
      if (avatarRef.current) {
        avatarRef.current.innerHTML = `
          <div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,0.3);cursor:pointer;" onclick="if(window.avatar)window.avatar.speak('Hello! I am your AI assistant. Click the microphone button to start a conversation with me.')">
            <div style="text-align:center;padding:20px;">
              <div style="font-size:48px;margin-bottom:10px;">🤖</div>
              <div style="font-weight:bold;margin-bottom:5px;">AI Avatar Assistant</div>
              <div style="font-size:14px;margin-bottom:10px;opacity:0.8;">Powered by Gemini AI + Deepgram</div>
              <div style="font-size:12px;opacity:0.6;">
                Development Mode - Click to test voice
              </div>
              <div style="font-size:10px;margin-top:10px;opacity:0.5;">
                Voice: Browser TTS | Chat: Gemini AI
              </div>
            </div>
          </div>
        `
      }
    }

    // Wait a bit for SDK to load, then initialize
    const timeoutId = setTimeout(() => {
      initializeAvatar()
    }, 2000)

    // Cleanup function
    return () => {
      mounted = false
      clearTimeout(timeoutId)
      events.forEach(event => {
        document.removeEventListener(event, interactionHandler)
      })
      window.removeEventListener('beyondPresenceLoaded', bpLoadHandler)
      
      if (window.avatar) {
        window.avatar.destroy()
        window.avatar = null
      }
      
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [userInteracted])

  return (
    <div className="avatar-container" onClick={handleUserInteraction}>
      <div ref={avatarRef} style={{ width: '100%', height: '100%' }} />
      
      {!isConnected && !connectionError && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.7)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div>🚀 Initializing AI Avatar...</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
            {isBeyondPresenceLoaded ? 'Beyond Presence Connected' : 'Loading AI Services...'}
          </div>
          {!userInteracted && (
            <div style={{ fontSize: '0.7rem', marginTop: '10px', color: '#ffd700' }}>
              Click anywhere to enable audio
            </div>
          )}
        </div>
      )}
      
      {connectionError && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: '#ff6b6b',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '80%'
        }}>
          <div>⚠️ Connection Error</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>{connectionError}</div>
          <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.7 }}>
            Using fallback mode - text chat will still work
          </div>
          {!userInteracted && (
            <div style={{ fontSize: '0.7rem', marginTop: '10px', color: '#ffd700' }}>
              Click anywhere to enable audio
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Avatar