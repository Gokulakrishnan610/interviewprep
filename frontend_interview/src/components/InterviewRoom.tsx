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
  const navigate = useNavigate();

  const endCall = () => {
    try {
      if (room) {
        room.disconnect();
        setRoom(null);
      }
    } catch (err) {
      console.error('Failed to end call:', err);
    } finally {
      navigate('/dashboard');
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
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`} 
            onClick={toggleVideo}
            disabled={isConnecting || !room}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <Video size={20} />
          </button>
          <button 
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`} 
            onClick={toggleAudio}
            disabled={isConnecting || !room}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            <Mic size={20} />
          </button>
          <button 
            className={`control-btn ${isChatVisible ? 'active' : ''}`} 
            onClick={toggleChat}
            disabled={isConnecting}
            title="Toggle chat"
          >
            <MessageCircle size={20} />
          </button>
          <button 
            className="control-btn"
            disabled={true}
            title="Settings (coming soon)"
          >
            <Settings size={20} />
          </button>
          <button 
            className="control-btn end-call" 
            onClick={endCall}
            title="End call"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </header>

      <div className="interview-body">
        <div className="interviewer-view">
          <div className="video-container">
            {participants.size > 0 ? (
              (() => {
                const remoteParticipant = Array.from(participants.values())[0];
                const videoTracks = Array.from(remoteParticipant.videoTrackPublications.values());
                const videoTrack = videoTracks.length > 0 ? videoTracks[0].track : null;
                return videoTrack ? (
                  <div className="video-wrapper">
                    <video
                      ref={el => {
                        if (el && videoTrack) {
                          videoTrack.attach(el);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="interviewer-video"
                    />
                  </div>
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
                );
              })()
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
          {participants.size > 0 && (() => {
            const remoteParticipant = Array.from(participants.values())[0];
            const audioTracks = Array.from(remoteParticipant.audioTrackPublications.values());
            const audioTrack = audioTracks.length > 0 ? audioTracks[0].track : null;
            return audioTrack ? (
              <audio
                ref={el => {
                  if (el && audioTrack) {
                    audioTrack.attach(el);
                  }
                }}
                autoPlay
                playsInline
              />
            ) : null;
          })()}
        </div>

        <div className="user-view">
          <div className="video-container">
            {localParticipant && localParticipant.videoTrackPublications.size > 0 ? (
              <div className="video-wrapper">
                <video
                  ref={el => {
                    if (el && localParticipant) {
                      const videoTracks = Array.from(localParticipant.videoTrackPublications.values());
                      const videoTrack = videoTracks.length > 0 ? videoTracks[0].track : null;
                      if (videoTrack) {
                        videoTrack.attach(el);
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