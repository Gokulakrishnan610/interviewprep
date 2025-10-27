import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '@livekit/components-styles';
import {
  useRoomContext,
  usePagination,
  useParticipants,
  useLocalParticipant,
  useRemoteParticipant,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react';
import { 
  Room, 
  RoomOptions, 
  VideoPresets,
  RoomEvent,
  Participant,
  RemoteParticipant,
  LocalParticipant,
  Track,
  RemoteTrack,
  LocalTrack,
  RemoteTrackPublication,
  LocalTrackPublication
} from 'livekit-client';
import { 
  Video, 
  Mic, 
  PhoneOff, 
  MessageCircle, 
  Clock, 
  Settings 
} from 'lucide-react';
import { apiService } from '../services/api';
import '../styles/InterviewRoom.css';

const InterviewRoom: React.FC = () => {
  const { id, interviewId } = useParams<{ id?: string; interviewId?: string }>();
  const effectiveId = id || interviewId || '';
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    text: string;
    sender: 'user' | 'interviewer';
    timestamp: Date;
  }>>([]);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [conversationLog, setConversationLog] = useState<Array<{speaker: string, message: string, timestamp: string}>>([]);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const navigate = useNavigate();

  const endCall = async () => {
    if (isEndingInterview) return;
    
    setIsEndingInterview(true);
    
    try {
      // End the interview session and get scores
      const response = await fetch(`http://localhost:8002/api/interview/end-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Interview scores:', data.scores);
        
        // Navigate to results page with scores
        navigate('/interview-results', { 
          state: { 
            sessionId, 
            scores: data.scores,
            conversation: conversationLog,
            duration: elapsedTime
          } 
        });
      } else {
        throw new Error('Failed to get interview scores');
      }
    } catch (err) {
      console.error('Failed to end interview:', err);
      // Navigate to dashboard on error
      navigate('/dashboard');
    } finally {
      if (room) {
        room.disconnect();
        setRoom(null);
      }
    }
  };

  useEffect(() => {
    const joinInterview = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Get room connection details from backend
        const response = await apiService.startInterview(effectiveId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to get room connection details');
        }

        const { token, room: roomName } = response.data;

        // Connect to LiveKit room
        const roomOptions: RoomOptions = {
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720,
          },
        };

        const newRoom = new Room(roomOptions);
        setRoom(newRoom);

        // Handle room events
        newRoom
          .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('A participant connected:', participant.identity);
            setParticipants(prev => new Map(prev.set(participant.identity, participant)));
          })
          .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('A participant disconnected:', participant.identity);
            setParticipants(prev => {
              const newMap = new Map(prev);
              newMap.delete(participant.identity);
              return newMap;
            });
          })
          .on(RoomEvent.Disconnected, () => {
            setIsConnecting(false);
            setError('Disconnected from room');
          })
          .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind);
          })
          .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log('Track unsubscribed:', track.kind);
          })
          .on(RoomEvent.LocalTrackPublished, () => {
            setLocalParticipant(newRoom.localParticipant);
          })
          .on(RoomEvent.LocalTrackUnpublished, () => {
            setLocalParticipant(newRoom.localParticipant);
          });

        // Connect to the room
        await newRoom.connect(process.env.REACT_APP_LIVEKIT_URL!, token);
        
        // Start with video and audio enabled
        await newRoom.localParticipant.enableCameraAndMicrophone();
        
        setIsConnecting(false);
      } catch (err: any) {
        console.error('Failed to join interview:', err);
        setError(err.message || 'Failed to join interview');
        setIsConnecting(false);
      }
    };

    if (effectiveId) {
      joinInterview();
    }

    // Cleanup function
    return () => {
      if (room) {
        room.disconnect();
        setRoom(null);
      }
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize interview session
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await fetch('http://localhost:8002/api/interview/start-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: 'user_' + effectiveId,
            interview_type: 'technical'
          })
        });
        
        if (response.ok) {
          console.log('Interview session started:', sessionId);
        }
      } catch (err) {
        console.error('Failed to start interview session:', err);
      }
    };
    
    initSession();
  }, [sessionId, effectiveId]);

  // Listen for messages from Beyond Presence iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from Beyond Presence domain
      if (!event.origin.includes('bey.chat')) return;
      
      try {
        const data = event.data;
        
        // Handle conversation messages
        if (data.type === 'conversation' || data.type === 'transcript') {
          const message = {
            speaker: data.speaker || (data.role === 'agent' ? 'interviewer' : 'candidate'),
            message: data.message || data.text || '',
            timestamp: new Date().toISOString()
          };
          
          // Add to local conversation log
          setConversationLog(prev => [...prev, message]);
          
          // Send to backend
          await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
        }
      } catch (err) {
        console.error('Error processing message from iframe:', err);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleChat = () => {
    setIsChatVisible(!isChatVisible);
  };

  const toggleVideo = async () => {
    if (!room || isConnecting) {
      console.warn('Room not ready yet');
      return;
    }
    
    try {
      const newState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  const toggleAudio = async () => {
    if (!room || isConnecting) {
      console.warn('Room not ready yet');
      return;
    }
    
    try {
      const newState = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  };

  return (
    <div className="interview-container">
      <header className="interview-header">
        <div className="interview-timer">
          <Clock size={20} />
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="interview-controls">
          <button 
            className="control-btn end-call" 
            onClick={endCall}
            title="Exit Interview"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </header>

      <div className="interview-body">
        <div className="interviewer-view">
          {/* Beyond Presence Agent Container */}
          <div id="agent-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <iframe 
              src="https://bey.chat/bbe33449-03e7-43ae-b6d5-5c8bf138f52a" 
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              allow="camera; microphone; fullscreen"
              allowFullScreen
              title="Beyond Presence AI Interviewer"
            />
          </div>
          <div className="interviewer-info">
            <h3>AI Interviewer</h3>
            <span className="status">Online</span>
          </div>
        </div>
      </div>

      <div className={`chat-overlay ${isChatVisible ? 'visible' : ''}`}>
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.sender === 'user' ? 'user-message' : 'interviewer-message'}`}
            >
              <p>{msg.text}</p>
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;