import React, { useEffect, useRef, useState } from 'react'
import { connectLiveKit } from '../api/livekit'

const BeyondPresenceAvatar = () => {
  const avatarRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let avatarInstance = null

    const initializeAvatar = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🚀 Initializing Beyond Presence Avatar...')

        // 1. Get Beyond Presence token
        const tokenRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/avatar/token`)
        const tokenData = await tokenRes.json()

        if (!tokenData.success) {
          throw new Error(`Failed to get token: ${tokenData.error || 'Unknown error'}`)
        }

        // 2. Get LiveKit token and connect
        console.log('🔗 Connecting to LiveKit...')
        const livekitRoom = await connectLiveKit()
        console.log('✅ LiveKit connected')

        // 3. Initialize Beyond Presence Avatar
        if (window.BeyondPresence) {
          console.log('🎭 Creating Beyond Presence Avatar instance...')
          
          avatarInstance = new window.BeyondPresence.Avatar({
            container: avatarRef.current,
            token: tokenData.access_token,
            livekit: {
              room: livekitRoom,
            },
            style: {
              width: '100%',
              height: '100%',
              background: '#000',
              borderRadius: '1rem',
            },
            onReady: () => {
              if (!mounted) return
              console.log('✅ Beyond Presence Avatar ready!')
              setIsConnected(true)
              setIsLoading(false)
              setError(null)
            },
            onError: (error) => {
              if (!mounted) return
              console.error('❌ Beyond Presence Avatar error:', error)
              setError(error.message || 'Avatar failed to initialize')
              setIsLoading(false)
            }
          })

          // Start the avatar
          await avatarInstance.start()
          window.beyondPresenceAvatar = avatarInstance

          console.log('🎬 Beyond Presence Avatar started successfully')

        } else {
          console.warn('⚠️ Beyond Presence SDK not available - using fallback mode')
          // Don't throw error, just use fallback
          if (!mounted) return
          setError('SDK not available')
          setIsLoading(false)
          createFallbackDisplay()
          return
        }

      } catch (error) {
        if (!mounted) return
        console.error('❌ Failed to initialize Beyond Presence Avatar:', error)
        setError(error.message)
        setIsLoading(false)
        createFallbackDisplay()
      }
    }

    const createFallbackDisplay = () => {
      if (avatarRef.current) {
        avatarRef.current.innerHTML = `
          <div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <div style="text-align:center;padding:20px;">
              <div style="font-size:64px;margin-bottom:15px;animation:pulse 2s ease-in-out infinite;">🎭</div>
              <div style="font-weight:bold;font-size:24px;margin-bottom:10px;">AI Interview Agent</div>
              <div style="font-size:14px;margin-bottom:15px;opacity:0.9;">Ready for conversation</div>
              <div style="font-size:12px;opacity:0.7;background:rgba(255,255,255,0.1);padding:8px 12px;border-radius:5px;">
                Voice & Chat Interface Active
              </div>
              <div style="font-size:10px;margin-top:15px;opacity:0.5;">
                Powered by Gemini AI + LiveKit
              </div>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>
        `
      }
      setIsConnected(true)
      setIsLoading(false)
    }

    // Start initialization
    initializeAvatar()

    // Cleanup
    return () => {
      mounted = false
      if (avatarInstance) {
        try {
          avatarInstance.destroy()
        } catch (e) {
          console.error('Error destroying avatar:', e)
        }
      }
      if (window.beyondPresenceAvatar) {
        delete window.beyondPresenceAvatar
      }
    }
  }, [])

  return (
    <div className="avatar-container">
      <div ref={avatarRef} style={{ width: '100%', height: '100%' }} />
      
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎭</div>
          <div>Initializing Beyond Presence...</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.7 }}>
            Loading digital human avatar
          </div>
        </div>
      )}
      
      {error && !isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: '#ff6b6b',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '80%'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
          <div>Avatar Connection Error</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.8 }}>
            {error}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.6 }}>
            Using text interface only
          </div>
        </div>
      )}
      
      {isConnected && !error && !isLoading && (
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          left: '10px',
          color: '#00ff88',
          background: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '0.7rem'
        }}>
          ✅ Beyond Presence Connected
        </div>
      )}
    </div>
  )
}

export default BeyondPresenceAvatar