import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Clock, User, Bot } from 'lucide-react';

interface TranscriptEntry {
  id: string;
  speaker: 'STUDENT' | 'AI_INTERVIEWER';
  message: string;
  timestamp: string;
}

const VoiceInterview: React.FC = () => {
  const { interviewId, agentId } = useParams<{ interviewId?: string; agentId?: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionType, setSessionType] = useState<'interview' | 'practice'>('interview');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Determine session type based on URL parameters
    if (agentId) {
      setSessionType('practice');
    } else if (interviewId) {
      setSessionType('interview');
    }
    
    if (interviewId || agentId) {
      initializeSession();
    }
    
    return () => {
      cleanup();
    };
  }, [interviewId, agentId]);

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

  const initializeSession = async () => {
    try {
      const sessionId = interviewId || agentId;
      const wsUrl = `ws://localhost:8000/ws/${sessionId}`;
      websocketRef.current = new WebSocket(wsUrl);
      
              websocketRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          
          websocketRef.current?.send(JSON.stringify({
            type: 'join_session',
            participant_id: authState.user?.id,
            participant_name: `${authState.user?.first_name} ${authState.user?.last_name}`,
            role: 'student',
            session_type: sessionType
          }));
        };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'session_ready':
        console.log('Session ready:', data);
        setSessionStarted(true);
        
        // Initialize LiveKit if available
        if (data.livekit_info && data.livekit_info.token) {
          initializeLiveKit(data.livekit_info);
        }
        break;
      case 'ai_response':
        console.log('AI response:', data);
        // Add AI response to transcript
        setTranscript(prev => [...prev, {
          id: `ai_${Date.now()}`,
          speaker: 'AI_INTERVIEWER',
          message: data.message,
          timestamp: data.timestamp
        }]);
        break;
      case 'ai_audio':
        console.log('AI audio received');
        // Play AI audio response
        playAudioFromBase64(data.audio_data);
        break;
      case 'transcript_update':
        setTranscript(prev => [...prev, data.entry]);
        break;
      case 'interview_feedback':
        console.log('Interview feedback:', data.feedback);
        // Handle feedback display
        setFeedback(data.feedback);
        break;
      case 'session_ended':
        console.log('Session ended:', data);
        setSessionStarted(false);
        // Show feedback if available
        if (feedback) {
          alert('Interview completed! Check your feedback below.');
        }
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const playAudioFromBase64 = (base64Audio: string) => {
    try {
      const audioBlob = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error('Error playing audio:', e));
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  const initializeLiveKit = (livekitInfo: any) => {
    console.log('Initializing LiveKit with:', livekitInfo);
    // TODO: Implement LiveKit client connection
    // This would connect to LiveKit room for real-time audio streaming
    // For now, we'll use WebSocket audio data
  };

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

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

  const cleanup = () => {
    stopRecording();
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



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
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button 
                className="control-btn bg-red-500 hover:bg-red-600"
                onClick={endSession}
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