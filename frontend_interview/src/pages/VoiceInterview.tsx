import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Clock } from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';

interface TranscriptEntry {
  id: string;
  speaker: 'STUDENT' | 'AI_INTERVIEWER';
  message: string;
  timestamp: string;
}

const VoiceInterview: React.FC = () => {
  const { interviewId, agentId } = useParams<{ interviewId?: string; agentId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const initializeLiveKit = useCallback(async (token: string, roomName: string) => {
    try {
      console.log('Connecting to LiveKit room:', roomName);

      const livekitRoom = new Room();
      setRoom(livekitRoom);

      // Connect to LiveKit
      await livekitRoom.connect(process.env.REACT_APP_LIVEKIT_URL!, token);

      console.log('Connected to LiveKit room successfully');
      setIsConnected(true);
      setSessionStarted(true);

      // Set up event listeners
      livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
      });

      livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
      });

      livekitRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setIsConnected(false);
      });

    } catch (error) {
      console.error('Error connecting to LiveKit:', error);
      setIsConnected(false);
    }
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      // Extract room token from URL parameters
      const token = searchParams.get('token');
      const roomName = interviewId || agentId;

      if (!token || !roomName) {
        console.error('Missing token or room name');
        return;
      }

      // Connect to LiveKit directly
      await initializeLiveKit(token, roomName);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }, [searchParams, interviewId, agentId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current) {
          const sessionId = interviewId || agentId;
          websocketRef.current.send(JSON.stringify({
            type: 'audio_data',
            interview_id: sessionId,
            audio_data: event.data
          }));
        }
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setElapsedTime(0); // Reset timer when starting
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const endSession = async () => {
    stopRecording();
    
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'end_session'
      }));
    }
    
    navigate('/dashboard');
  };

  const cleanup = useCallback(() => {
    stopRecording();
    if (room) {
      room.disconnect();
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  }, [room, stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (interviewId || agentId) {
      initializeSession();
    }
    
    return () => {
      cleanup();
    };
  }, [interviewId, agentId, initializeSession, cleanup]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="interview-container">
          <div className="interview-header">
            <div className="flex items-center space-x-4">
              <div className="interview-timer">
                <Clock className="w-5 h-5" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {sessionStarted && (
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="font-medium">Session Active</span>
                </div>
              )}
            </div>
            
            <div className="interview-controls">
              <button 
                className={`control-btn ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button 
                className={`control-btn ${isMuted ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button 
                className="control-btn bg-red-500 hover:bg-red-600"
                onClick={endSession}
                aria-label="End interview session"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="interview-body">
            <div className="interviewer-view">
              <div className="video-container">
                <div className="avatar-placeholder">
                  <img 
                    src="/interviewer-avatar.png" 
                    alt="HR Interviewer"
                    className="interviewer-avatar"
                  />
                </div>
              </div>
              <div className="interviewer-info">
                <h3>HR Interviewer</h3>
                <span className={`status ${isConnected ? 'online' : 'offline'}`}>
                  {isConnected ? 'Online' : 'Connecting...'}
                </span>
              </div>
            </div>

            <div className="user-view">
              <div className="video-container">
                <video 
                  id="localVideo" 
                  autoPlay 
                  muted 
                  playsInline
                  className="user-video"
                />
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                {!sessionStarted ? 'Connecting to AI interviewer...' : 
                 isRecording ? 'Recording... Speak clearly into your microphone' : 
                 'Click the microphone to start speaking with the AI'}
              </p>
              {sessionStarted && !isRecording && (
                <p className="text-xs text-gray-500 mt-1">
                  The AI interviewer is ready to start the conversation
                </p>
              )}
            </div>
          </div>

          <div className={`chat-overlay ${transcript.length > 0 ? 'visible' : ''}`}>
            <div className="chat-messages">
              {transcript.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`message ${entry.speaker === 'STUDENT' ? 'user-message' : 'interviewer-message'}`}
                >
                  <p>{entry.message}</p>
                  <span className="message-time">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterview; 