import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  speaker: 'STUDENT' | 'AI_INTERVIEWER';
  message: string;
  timestamp: string;
}

const TextChat: React.FC = () => {
  const { interviewId, agentId } = useParams<{ interviewId?: string; agentId?: string }>();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const websocketRef = useRef<WebSocket | null>(null);
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
    const wsUrl = `ws://localhost:8001/ws/${sessionId}`;
    
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
        break;
      case 'ai_response':
        console.log('AI response:', data);
        setMessages(prev => [...prev, {
          id: `ai_${Date.now()}`,
          speaker: 'AI_INTERVIEWER',
          message: data.message,
          timestamp: data.timestamp
        }]);
        break;
      case 'transcript_update':
        setMessages(prev => [...prev, {
          id: data.entry.id,
          speaker: data.entry.speaker === 'Student' ? 'STUDENT' : 'AI_INTERVIEWER',
          message: data.entry.message,
          timestamp: data.entry.timestamp
        }]);
        break;
      case 'interview_feedback':
        console.log('Interview feedback:', data.feedback);
        alert(`Interview completed! Score: ${data.feedback.overall_score}/10`);
        break;
      case 'session_ended':
        console.log('Session ended:', data);
        setSessionStarted(false);
        navigate('/dashboard');
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !websocketRef.current) return;
    
    setIsLoading(true);
    
    // Add user message to chat
    const userMessage = {
      id: `user_${Date.now()}`,
      speaker: 'STUDENT' as const,
      message: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send text message to backend
    websocketRef.current.send(JSON.stringify({
      type: 'text_message',
      message: inputMessage
    }));
    
    setInputMessage('');
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const endSession = () => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'end_session'
      }));
    }
    navigate('/dashboard');
  };

  const cleanup = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {agentId ? 'Practice Session' : 'Text Interview'}
              </h1>
              <p className="text-gray-600">
                {agentId 
                  ? 'Text-based practice with AI agent' 
                  : 'Text-based AI interview session'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {sessionStarted && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="font-medium">Session Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p>Waiting for AI interviewer to start...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker === 'STUDENT' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.speaker === 'STUDENT'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                    <p className="text-sm">AI is typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isConnected || isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !isConnected || isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            <button
              onClick={endSession}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChat; 