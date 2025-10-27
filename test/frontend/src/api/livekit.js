// LiveKit client v2 compatibility with better error handling
let LiveKit = null;

// Function to initialize LiveKit client
const initLiveKit = async () => {
  if (LiveKit) return LiveKit;
  
  try {
    const module = await import('livekit-client');
    LiveKit = module;
    console.log('LiveKit client v2 loaded successfully');
    return module;
  } catch (error) {
    console.error('Failed to load LiveKit client:', error);
    throw error;
  }
};

// Enhanced TTS function that actually speaks
export const speakWithTTS = (text) => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve({
        success: false,
        error: 'TTS not supported',
        message: `Text would be: "${text}"`
      });
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices and try to find a good one
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(voice => 
      voice.lang.includes('en') && 
      (voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Alex') || voice.name.includes('Karen'))
    );
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
      console.log('Using TTS voice:', preferredVoices[0].name);
    }

    // Configure speech
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('TTS started speaking:', text);
    };

    utterance.onend = () => {
      console.log('TTS finished speaking');
      resolve({
        success: true,
        message: `TTS spoke: "${text}"`,
        call_id: 'tts-call-' + Date.now(),
        method: 'browser_tts'
      });
    };

    utterance.onerror = (event) => {
      console.error('TTS error:', event.error);
      resolve({
        success: false,
        error: 'TTS failed',
        message: `Failed to speak: "${text}"`
      });
    };

    // Speak the text
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak:', error);
      resolve({
        success: false,
        error: 'TTS exception',
        message: `Failed to speak: "${text}"`
      });
    }
  });
};

export async function connectLiveKit() {
  // Check if we have a valid LiveKit URL (not localhost/mock)
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const isMockUrl = !livekitUrl || livekitUrl.includes('localhost') || livekitUrl.includes('mock');
  
  if (isMockUrl) {
    console.log('Mock LiveKit URL detected, using mock room');
    return createMockRoom();
  }

  try {
    const LiveKitModule = await initLiveKit();
    
    // Get LiveKit token from backend
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/livekit/token?identity=user-${Math.random().toString(36).substring(7)}`);
    const data = await response.json();
    
    if (!data.success) {
      console.warn('Failed to get LiveKit token, using mock:', data.error);
      return createMockRoom();
    }

    // Check if token is mock
    if (data.token.includes('mock') || !data.token) {
      console.warn('Mock LiveKit token detected, using mock room');
      return createMockRoom();
    }

    // In v2, we use Room object and connect method
    const room = new LiveKitModule.Room();
    
    // Set up event listeners before connecting
    room.on(LiveKitModule.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'audio') {
        const audioElement = track.attach();
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        console.log('Subscribed to audio track from:', participant.identity);
      }
    });

    // Connect to the room with timeout
    const connectPromise = room.connect(livekitUrl, data.token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('LiveKit connection timeout')), 10000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('Successfully connected to LiveKit room:', room.name);
    
    return room;

  } catch (error) {
    console.error('Failed to connect to LiveKit:', error);
    
    // Fallback: Return a mock room for development
    console.log('Using mock LiveKit room for development');
    return createMockRoom();
  }
}

function createMockRoom() {
  return {
    name: 'mock-room',
    on: (event, callback) => {
      console.log(`Mock room: Event '${event}' subscribed`);
    },
    disconnect: () => {
      console.log('Mock room: Disconnected');
    },
    isConnected: true,
    localParticipant: {
      identity: 'mock-user'
    }
  };
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
    
    // Use TTS as fallback
    return await speakWithTTS(text);
  }
}