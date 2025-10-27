import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '@livekit/components-styles';
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
  FaVideo, 
  FaMicrophone, 
  FaPhoneSlash, 
  FaComments, 
  FaClock, 
  FaCog 
} from 'react-icons/fa/index.js';
import { apiService } from '../services/api';
import '../styles/InterviewRoom.css';

const InterviewRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);

  useEffect(() => {
    const joinInterview = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Get room connection details from backend
        const response = await apiService.startInterview(id!);
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
          .on(RoomEvent.ParticipantConnected, () => {
            console.log('A participant connected');
            setParticipants(new Map(newRoom.remoteParticipants));
          })
          .on(RoomEvent.ParticipantDisconnected, () => {
            console.log('A participant disconnected');
            setParticipants(new Map(newRoom.remoteParticipants));
          })
          .on(RoomEvent.Disconnected, () => {
            setIsConnecting(false);
            setError('Disconnected from room');
          })
          .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            setParticipants(new Map(newRoom.remoteParticipants));
          })
          .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            setParticipants(new Map(newRoom.remoteParticipants));
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

    if (id) {
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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleChat = () => {
    setIsChatVisible(!isChatVisible);
  };

  const toggleVideo = async () => {
    if (!room) return;
    
    try {
      if (isVideoEnabled) {
        await room.localParticipant.setCameraEnabled(false);
      } else {
        await room.localParticipant.setCameraEnabled(true);
      }
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  const toggleAudio = async () => {
    if (!room) return;
    
    try {
      if (isAudioEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  };

  return (
    <div className="interview-container">
      <header className="interview-header">
        <div className="interview-timer">
          {/* @ts-ignore */}
          <FaClock size={20} />
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="interview-controls">
          <button 
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`} 
            onClick={toggleVideo}
          >
            {/* @ts-ignore */}
            <FaVideo size={20} />
          </button>
          <button 
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`} 
            onClick={toggleAudio}
          >
            {/* @ts-ignore */}
            <FaMicrophone size={20} />
          </button>
          <button 
            className={`control-btn ${isChatVisible ? 'active' : ''}`} 
            onClick={toggleChat}
          >
            {/* @ts-ignore */}
            <FaComments size={20} />
          </button>
          <button className="control-btn">
            {/* @ts-ignore */}
            <FaCog size={20} />
          </button>
          <button className="control-btn end-call">
            {/* @ts-ignore */}
            <FaPhoneSlash size={20} />
          </button>
        </div>
      </header>

      <div className="interview-body">
        <div className="interviewer-view">
          <div className="video-container">
            {(participants as any).size > 0 ? (
              (Array.from((participants as any).values())[0] as any).videoTracks.size > 0 && (
                <div className="video-wrapper">
                  <video
                    ref={el => {
                      if (el && participants.size > 0) {
                        const remoteParticipant = Array.from((participants as any).values())[0] as any;
                        const videoTrack = Array.from(remoteParticipant.videoTracks.values())[0] as any;
                        if (videoTrack.track) {
                          videoTrack.track.attach(el);
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    className="interviewer-video"
                  />
                </div>
              )
            ) : (
              <div className="avatar-container">
                <div className="avatar-placeholder">
                  <img 
                    src="/beyond-presence-avatar.png" 
                    alt="AI Interviewer"
                    className="interviewer-avatar"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="interviewer-info">
            <h3>AI Interviewer</h3>
            <span className="status">{participants.size > 0 ? 'Online' : 'Connecting...'}</span>
          </div>
          {participants.size > 0 && 
           (Array.from((participants as any).values())[0] as any).audioTracks.size > 0 && (
            <audio
              ref={el => {
                if (el && participants.size > 0) {
                  const remoteParticipant = Array.from((participants as any).values())[0] as any;
                  const audioTrack = Array.from(remoteParticipant.audioTracks.values())[0] as any;
                  if (audioTrack.track) {
                    audioTrack.track.attach(el);
                  }
                }
              }}
              autoPlay
              playsInline
            />
          )}
        </div>

        <div className="user-view">
          <div className="video-container">
            {(localParticipant as any) && (localParticipant as any).videoTracks.size > 0 ? (
              <div className="video-wrapper">
                <video
                  ref={el => {
                    if (el && localParticipant) {
                      const videoTrack = Array.from((localParticipant as any).videoTracks.values())[0] as any;
                      if (videoTrack.track) {
                        videoTrack.track.attach(el);
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="user-video"
                />
              </div>
            ) : (
              <div className="avatar-container">
                <div className="avatar-placeholder">
                  <img 
                    src="/user-avatar.png" 
                    alt="You"
                    className="user-avatar"
                  />
                </div>
              </div>
            )}
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