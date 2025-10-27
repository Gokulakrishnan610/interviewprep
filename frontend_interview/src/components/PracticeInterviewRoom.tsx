import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from 'lucide-react';
import { LiveKitService, getLivekitToken, startBeyondPresenceAgent } from '../services/livekitService';

const PracticeInterviewRoom: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [agentConnected, setAgentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const livekitService = useRef<LiveKitService | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const agentVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializePracticeSession();

    return () => {
      // Cleanup on unmount
      if (livekitService.current) {
        livekitService.current.disconnect();
      }
    };
  }, []);

  const initializePracticeSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Generate room name
      const roomName = `practice-${agentId}-${Date.now()}`;
      const participantName = `user-${Math.random().toString(36).substr(2, 9)}`;

      console.log('🎯 Starting practice session:', roomName);

      // Get LiveKit token
      const token = await getLivekitToken(roomName, participantName);

      // Initialize LiveKit service
      livekitService.current = new LiveKitService();

      // Set up callbacks
      livekitService.current.onConnected(() => {
        console.log('✅ Connected to practice room');
        setIsConnected(true);
        setIsConnecting(false);
      });

      livekitService.current.onDisconnected(() => {
        console.log('🔌 Disconnected from practice room');
        setIsConnected(false);
      });

      livekitService.current.onParticipantConnected((participantName) => {
        console.log('👤 Agent connected:', participantName);
        setAgentConnected(true);
      });

      livekitService.current.onTrackSubscribed((track) => {
        if (track.kind === 'video' && agentVideoRef.current) {
          const videoElement = track.attach();
          agentVideoRef.current.appendChild(videoElement);
          console.log('📹 Agent video attached');
        }
      });

      // Connect to LiveKit room
      const room = await livekitService.current.connect({
        url: 'wss://interviewapp-86itzjcd.livekit.cloud',
        token: token,
        roomName: roomName,
      });

      // Attach local video
      if (videoRef.current && room.localParticipant.videoTrackPublications.size > 0) {
        const videoTrack = Array.from(room.localParticipant.videoTrackPublications.values())[0].videoTrack;
        if (videoTrack) {
          const videoElement = videoTrack.attach();
          videoRef.current.appendChild(videoElement);
        }
      }

      // Start Beyond Presence agent
      console.log('🤖 Starting Beyond Presence agent...');
      await startBeyondPresenceAgent(roomName);

    } catch (err) {
      console.error('❌ Error initializing practice session:', err);
      setError('Failed to start practice session. Please try again.');
      setIsConnecting(false);
    }
  };

  const toggleMicrophone = async () => {
    if (livekitService.current) {
      const enabled = await livekitService.current.toggleMicrophone();
      setIsMicEnabled(enabled);
    }
  };

  const toggleCamera = async () => {
    if (livekitService.current) {
      const enabled = await livekitService.current.toggleCamera();
      setIsCameraEnabled(enabled);
    }
  };

  const endSession = async () => {
    if (livekitService.current) {
      await livekitService.current.disconnect();
    }
    navigate('/practice');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Practice Interview</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isConnecting && 'Connecting...'}
              {isConnected && !agentConnected && 'Waiting for AI coach...'}
              {isConnected && agentConnected && '✅ AI coach is ready'}
            </p>
          </div>
          
          <button
            onClick={endSession}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PhoneOff size={20} />
            End Session
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center">
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
        {/* AI Coach Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <div ref={agentVideoRef} className="w-full h-full flex items-center justify-center">
            {!agentConnected ? (
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Volume2 size={48} className="text-gray-500" />
                </div>
                <p className="text-gray-400">Waiting for AI coach...</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white">AI Coach (Priya)</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded text-white text-sm">
            AI Coach
          </div>
        </div>

        {/* Your Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <div ref={videoRef} className="w-full h-full flex items-center justify-center">
            {!isConnected && (
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video size={48} className="text-gray-500" />
                </div>
                <p className="text-gray-400">Connecting...</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded text-white text-sm">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMicrophone}
            disabled={!isConnected}
            className={`p-4 rounded-full transition-colors ${
              isMicEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMicEnabled ? (
              <Mic size={24} className="text-white" />
            ) : (
              <MicOff size={24} className="text-white" />
            )}
          </button>

          <button
            onClick={toggleCamera}
            disabled={!isConnected}
            className={`p-4 rounded-full transition-colors ${
              isCameraEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCameraEnabled ? (
              <Video size={24} className="text-white" />
            ) : (
              <VideoOff size={24} className="text-white" />
            )}
          </button>
        </div>

        <div className="text-center mt-4 text-sm text-gray-400">
          {isConnecting && 'Setting up your practice session...'}
          {isConnected && !agentConnected && 'Waiting for AI coach to join...'}
          {isConnected && agentConnected && 'Practice session is live! Start speaking to begin.'}
        </div>
      </div>
    </div>
  );
};

export default PracticeInterviewRoom;
