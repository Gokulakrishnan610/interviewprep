import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, RemoteTrack, RemoteAudioTrack, RemoteTrackPublication, DataPacket_Kind } from 'livekit-client';

interface Message {
  id: string;
  speaker: 'STUDENT' | 'AI_INTERVIEWER';
  message: string;
  timestamp: string;
  type: 'text' | 'audio' | 'transcript';
}

interface LiveKitInfo {
  url: string;
  token: string;
  room_name: string;
}

const LiveKitInterview: React.FC = () => {
  const { interviewId, agentId } = useParams<{ interviewId?: string; agentId?: string }>();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [livekitInfo, setLivekitInfo] = useState<LiveKitInfo | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState<any>(null);
  
  const roomRef = useRef<Room | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (interviewId || agentId) {
      initializeSession();
    }
    return () => cleanup();
  }, [interviewId, agentId]);

  const initializeSession = async () => {
    const sessionId = interviewId || agentId;
    
    // First, connect to WebSocket for session management
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
        session_type: agentId ? 'practice' : 'interview'
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
    
    websocketRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'session_ready':
        console.log('Session ready:', data);
        setSessionStarted(true);
        
        // If LiveKit info is provided, connect to LiveKit room
        if (data.livekit_info) {
          setLivekitInfo(data.livekit_info);
          connectToLiveKitRoom(data.livekit_info);
        }
        break;
        
      case 'ai_response':
        console.log('AI response:', data);
        setMessages(prev => [...prev, {
          id: `ai_${Date.now()}`,
          speaker: 'AI_INTERVIEWER',
          message: data.message,
          timestamp: data.timestamp,
          type: 'text'
        }]);
        break;
        
      case 'ai_audio':
        console.log('AI audio received');
        playAudioFromBase64(data.audio_data);
        break;
        
      case 'transcript_update':
        setMessages(prev => [...prev, {
          id: data.entry.id,
          speaker: data.entry.speaker === 'Student' ? 'STUDENT' : 'AI_INTERVIEWER',
          message: data.entry.message,
          timestamp: data.entry.timestamp,
          type: 'transcript'
        }]);
        setTranscript(prev => prev + '\n' + data.entry.message);
        break;
        
      case 'interview_feedback':
        console.log('Interview feedback:', data.feedback);
        setFeedback(data.feedback);
        break;
        
      case 'session_ended':
        console.log('Session ended:', data);
        setSessionStarted(false);
        cleanup();
        navigate('/dashboard');
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const connectToLiveKitRoom = async (livekitInfo: LiveKitInfo) => {
    try {
      console.log('Connecting to LiveKit room:', livekitInfo.room_name);
      
      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      
      roomRef.current = room;
      
      // Set up room event listeners
      room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.on(RoomEvent.DataReceived, handleDataReceived);
      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      
      // Connect to the room
      await room.connect(livekitInfo.url, livekitInfo.token, {
        autoSubscribe: true,
      });
      
      console.log('Connected to LiveKit room');
      
      // Enable local audio
      await room.localParticipant.setMicrophoneEnabled(true);
      
      // Start recording audio for processing
      startAudioRecording();
      
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity);
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
  };

  const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload));
      console.log('Data received from LiveKit:', data);
      
      if (data.type === 'ai_response') {
        setMessages(prev => [...prev, {
          id: `ai_${Date.now()}`,
          speaker: 'AI_INTERVIEWER',
          message: data.message,
          timestamp: new Date().toISOString(),
          type: 'text'
        }]);
      }
    } catch (error) {
      console.error('Error parsing LiveKit data:', error);
    }
  };

  const handleTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log('Track subscribed from participant:', participant.identity);

    // Only handle audio tracks here
    if ((track as RemoteAudioTrack).kind === 'audio') {
      const audioTrack = track as RemoteAudioTrack;
      const audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
      if (audioElement) {
        audioTrack.attach(audioElement);
      }
    }
  };

  const handleTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.log('Track unsubscribed from participant:', participant.identity);
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioData(audioBlob);
        audioChunksRef.current = [];
      };
      
      // Start recording in chunks
      mediaRecorder.start(1000); // 1 second chunks
      setIsRecording(true);
      
      console.log('Audio recording started');
      
    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  };

  const processAudioData = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64 without using spread (avoids downlevelIteration requirement)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      
      // Send to backend via WebSocket
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'audio_data',
          audio_data: base64Audio,
          interview_id: interviewId || agentId
        }));
      }
      
      // Also send via LiveKit data channel
      if (roomRef.current) {
        const data = JSON.stringify({
          type: 'audio_data',
          audio_data: base64Audio,
          timestamp: new Date().toISOString()
        });
        
        await roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(data),
          { reliable: true }
        );
      }
      
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  };

  const playAudioFromBase64 = (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      
    } catch (error) {
      console.error('Error playing audio from base64:', error);
    }
  };

  const sendTextMessage = () => {
    const message = prompt('Enter your message:');
    if (message && websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'text_message',
        message: message
      }));
    }
  };

  const endSession = () => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'end_session'
      }));
    }
    cleanup();
    navigate('/dashboard');
  };

  const cleanup = () => {
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    // Disconnect from LiveKit room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                LiveKit Voice Interview
              </h1>
              <p className="text-gray-600">
                Real-time voice communication with AI interviewer
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {isRecording && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="font-medium">Recording</span>
                </div>
              )}
              {sessionStarted && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="font-medium">Session Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LiveKit Audio Controls */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Audio Controls</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => roomRef.current?.localParticipant.setMicrophoneEnabled(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Enable Mic
                </button>
                <button
                  onClick={() => roomRef.current?.localParticipant.setMicrophoneEnabled(false)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Disable Mic
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={sendTextMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Send Text Message
                </button>
                <button
                  onClick={endSession}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  End Session
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Status: {isRecording ? 'Recording audio' : 'Not recording'}</p>
                <p>LiveKit: {roomRef.current ? 'Connected' : 'Disconnected'}</p>
                <p>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>
            
            {/* Hidden audio element for remote audio */}
            <audio id="remote-audio" autoPlay style={{ display: 'none' }} />
          </div>

          {/* Messages */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Conversation</h2>
            
            <div className="h-64 overflow-y-auto mb-4 border rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p>Waiting for AI interviewer...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-2 rounded-lg ${
                        message.speaker === 'STUDENT'
                          ? 'bg-blue-100 ml-8'
                          : 'bg-gray-100 mr-8'
                      }`}
                    >
                      <div className="text-xs text-gray-500">
                        {message.speaker} - {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm">{message.message}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Interview Feedback</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold">Overall Score</h3>
                <p className="text-2xl font-bold text-blue-600">{feedback.overall_score}/10</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold">Strengths</h3>
                <ul className="text-sm">
                  {feedback.strengths?.map((strength: string, index: number) => (
                    <li key={index}>• {strength}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold">Improvements</h3>
                <ul className="text-sm">
                  {feedback.improvements?.map((improvement: string, index: number) => (
                    <li key={index}>• {improvement}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveKitInterview; 