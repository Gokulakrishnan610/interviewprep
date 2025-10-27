// LiveKit client compatibility layer
let LiveKit = null;

// Function to initialize LiveKit client
const initLiveKit = async () => {
  if (LiveKit) return LiveKit;
  
  try {
    // Try importing livekit-client
    const module = await import('livekit-client');
    LiveKit = module;
    console.log('LiveKit client loaded successfully:', Object.keys(module));
    return module;
  } catch (error) {
    console.error('Failed to load LiveKit client:', error);
    throw error;
  }
};

export async function connectLiveKit() {
  try {
    const LiveKitModule = await initLiveKit();
    
    // Get LiveKit token from backend
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/livekit/token?identity=user-${Math.random().toString(36).substring(7)}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get LiveKit token');
    }

    // Try different ways to find the connect function
    let connectFunction = null;
    
    // Method 1: Direct export
    if (LiveKitModule.connect) {
      connectFunction = LiveKitModule.connect;
    } 
    // Method 2: Default export
    else if (LiveKitModule.default && LiveKitModule.default.connect) {
      connectFunction = LiveKitModule.default.connect;
    }
    // Method 3: Room.connect (v2 style)
    else if (LiveKitModule.Room && LiveKitModule.Room.connect) {
      connectFunction = LiveKitModule.Room.connect;
    }
    // Method 4: Check for v2 style exports
    else if (LiveKitModule.createLocalTracks || LiveKitModule.Room) {
      // For v2, we might need to use Room directly
      console.log('LiveKit v2 detected, using Room class directly');
      // We'll handle v2 separately
    }

    if (!connectFunction) {
      console.warn('Standard connect methods not found, trying experimental approach...');
      
      // Experimental: Try to use the module as a function
      if (typeof LiveKitModule === 'function') {
        connectFunction = LiveKitModule;
      } else {
        throw new Error('LiveKit connect function not found. Available exports: ' + Object.keys(LiveKitModule).join(', '));
      }
    }

    // Connect to room
    const room = await connectFunction(import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880', data.token);
    
    // Set up event listeners
    if (room) {
      // Get RoomEvent from module
      const RoomEvent = LiveKitModule.RoomEvent || (LiveKitModule.default && LiveKitModule.default.RoomEvent);
      
      if (RoomEvent) {
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'audio') {
            const audioElement = track.attach();
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
            console.log('Subscribed to audio track from:', participant.identity);
          }
        });
      } else {
        console.warn('RoomEvent not found, audio subscription might not work');
      }

      console.log('Successfully connected to LiveKit room:', room.name);
      return room;
    } else {
      throw new Error('Failed to create room connection');
    }

  } catch (error) {
    console.error('Failed to connect to LiveKit:', error);
    
    // Fallback: Return a mock room for development
    console.log('Using mock LiveKit room for development');
    return {
      name: 'mock-room',
      on: () => {},
      disconnect: () => {},
      isConnected: true
    };
  }
}

export async function sendToAvatar(avatarId, text) {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/avatar/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        text: text
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send text to avatar');
    }

    return data;
  } catch (error) {
    console.error('Error sending to avatar:', error);
    
    // Mock response for development
    console.log(`Mock: Avatar would speak: "${text}"`);
    return {
      success: true,
      message: `Mock: Avatar spoke: "${text}"`,
      call_id: 'mock-call-' + Date.now()
    };
  }
}