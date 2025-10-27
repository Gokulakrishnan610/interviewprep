import React, { useEffect, useRef, useState } from 'react'
import { connectLiveKit } from '../api/livekit'

const Avatar = () => {
  const avatarRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    let mounted = true;

    async function initializeAvatar() {
      if (!mounted) return;
      
      try {
        setConnectionError(null);
        
        console.log('Initializing avatar...');
        
        // Get Beyond Presence token
        const tokenRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/avatar/token`);
        const tokenData = await tokenRes.json();
        
        if (!tokenData.success) {
          console.warn('Failed to get avatar token:', tokenData.error);
          // Continue with mock token for development
        }

        // Connect to LiveKit
        console.log('Connecting to LiveKit...');
        const livekitRoom = await connectLiveKit();
        console.log('LiveKit connection established');
        
        // Initialize Beyond Presence Avatar if SDK is available
        if (window.BeyondPresence) {
          console.log('Beyond Presence SDK found, initializing avatar...');
          
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
          });

          await avatar.start();
          window.avatar = avatar;
          setIsConnected(true);
          
          console.log('Avatar initialized successfully');
        } else {
          console.warn('Beyond Presence SDK not loaded. Check if the script is included in index.html');
          
          // Create a mock avatar for development
          const mockAvatar = {
            speak: (text) => {
              console.log('Mock avatar speaking:', text);
              // You could add text-to-speech here as a fallback
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
              }
              return Promise.resolve();
            },
            destroy: () => console.log('Mock avatar destroyed')
          };
          
          window.avatar = mockAvatar;
          setIsConnected(true);
          
          // Show placeholder
          if (avatarRef.current) {
            avatarRef.current.innerHTML = `
              <div style="width:100%;height:100%;background:linear-gradient(45deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:1rem;">
                <div style="text-align:center;">
                  <div>🤖 AI Avatar</div>
                  <div style="font-size:14px;margin-top:10px;opacity:0.8;">Beyond Presence SDK</div>
                  <div style="font-size:12px;margin-top:5px;opacity:0.6;">Development Mode</div>
                </div>
              </div>
            `;
          }
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to initialize avatar:', error);
        setConnectionError(`Initialization failed: ${error.message}`);
        
        // Create fallback avatar even on error
        const mockAvatar = {
          speak: (text) => {
            console.log('Fallback avatar speaking:', text);
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(text);
              window.speechSynthesis.speak(utterance);
            }
            return Promise.resolve();
          },
          destroy: () => console.log('Fallback avatar destroyed')
        };
        window.avatar = mockAvatar;
        setIsConnected(true);
      }
    }

    initializeAvatar();

    // Cleanup function
    return () => {
      mounted = false;
      if (window.avatar) {
        window.avatar.destroy();
        window.avatar = null;
      }
    };
  }, []);

  return (
    <div className="avatar-container">
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
          <div>Connecting Avatar...</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>Initializing LiveKit and Beyond Presence</div>
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
          <div>Connection Error</div>
          <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>{connectionError}</div>
          <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.7 }}>
            Using fallback mode - text chat will still work
          </div>
        </div>
      )}
    </div>
  )
}

export default Avatar