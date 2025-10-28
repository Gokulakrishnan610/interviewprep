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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [manualSpeaker, setManualSpeaker] = useState<'interviewer' | 'candidate'>('interviewer');
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

  // Listen for messages from Beyond Presence iframe and browser extension
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Log all messages for debugging
      console.log('📨 Received message:', {
        origin: event.origin,
        data: event.data
      });
      
      // Handle browser extension conversation data
      if (event.data.type === 'beyond-presence-conversation') {
        console.log('🎉 Received conversation from browser extension!');
        console.log(`   Messages: ${event.data.messages.length}`);
        
        for (const msg of event.data.messages) {
          // Add to local conversation log
          setConversationLog(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.message === msg.message && m.speaker === msg.speaker);
            if (exists) return prev;
            return [...prev, msg];
          });
          
          // Send to backend
          try {
            await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg)
            });
          } catch (err) {
            console.error('Error sending message to backend:', err);
          }
        }
        
        console.log('✅ All messages processed');
        return;
      }
      
      // Handle extractor status
      if (event.data.type === 'extractor-status') {
        console.log('📊 Browser extension status:', event.data.status);
        return;
      }
      
      // Only accept messages from Beyond Presence domain
      if (!event.origin.includes('bey.chat')) {
        return;
      }
      
      try {
        const data = event.data;
        console.log('✅ Processing message from Beyond Presence:', data);
        
        // Handle conversation messages - try multiple formats
        if (data.type === 'conversation' || data.type === 'transcript' || data.type === 'message') {
          const message = {
            speaker: data.speaker || (data.role === 'agent' ? 'interviewer' : 'candidate'),
            message: data.message || data.text || data.content || '',
            timestamp: new Date().toISOString()
          };
          
          console.log('💬 Captured message:', message);
          
          // Add to local conversation log
          setConversationLog(prev => [...prev, message]);
          
          // Send to backend
          const response = await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
          
          if (response.ok) {
            console.log('✅ Message sent to backend');
          } else {
            console.error('❌ Failed to send message to backend:', await response.text());
          }
        }
      } catch (err) {
        console.error('❌ Error processing message from iframe:', err);
      }
    };
    
    window.addEventListener('message', handleMessage);
    console.log('👂 Listening for messages from Beyond Presence iframe and browser extension');
    
    return () => {
      window.removeEventListener('message', handleMessage);
      console.log('🔇 Stopped listening for messages');
    };
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

  const addManualMessage = async () => {
    if (!manualMessage.trim()) return;

    const message = {
      speaker: manualSpeaker,
      message: manualMessage,
      timestamp: new Date().toISOString()
    };

    console.log('📝 Manually adding message:', message);

    // Add to local conversation log
    setConversationLog(prev => [...prev, message]);

    // Send to backend
    try {
      const response = await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('✅ Message sent to backend');
        setManualMessage('');
      } else {
        console.error('❌ Failed to send message:', await response.text());
      }
    } catch (err) {
      console.error('❌ Error sending message:', err);
    }
  };

  const addSampleConversation = async () => {
    const sampleMessages = [
      { speaker: 'interviewer', message: 'Hello! Thank you for joining us today. Can you tell me about yourself and your experience?' },
      { speaker: 'candidate', message: 'Hi! Thank you for having me. I have 5 years of experience in software development, primarily working with React and Node.js. I\'ve built several full-stack applications and led a team of 3 developers in my current role.' },
      { speaker: 'interviewer', message: 'That\'s great! Can you describe a challenging technical problem you\'ve solved recently?' },
      { speaker: 'candidate', message: 'Recently, I optimized our application\'s performance by implementing lazy loading and code splitting, which reduced initial load time by 60%. I also refactored our API calls to use caching strategies, improving response times significantly.' },
      { speaker: 'interviewer', message: 'Excellent! How do you handle conflicts within your team?' },
      { speaker: 'candidate', message: 'I believe in open communication. When conflicts arise, I facilitate discussions where everyone can share their perspective. I focus on finding solutions that benefit the project while respecting everyone\'s input.' }
    ];

    console.log('📝 Adding sample conversation...');

    for (const msg of sampleMessages) {
      const message = {
        ...msg,
        timestamp: new Date().toISOString()
      };

      setConversationLog(prev => [...prev, message]);

      await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Sample conversation added');
  };

  const extractFromConversationPanel = async () => {
    console.log('🔍 Attempting to extract from Beyond Presence conversation panel...');
    
    // Try to find the conversation panel in the DOM
    const selectors = [
      '[class*="onversation"]',
      '[class*="Conversation"]',
      'div[role="dialog"]',
      'div[class*="chat"]',
      'div[class*="Chat"]'
    ];
    
    for (const selector of selectors) {
      const panel = document.querySelector(selector);
      if (panel) {
        console.log(`✅ Found conversation panel with selector: ${selector}`);
        
        // Try to extract messages
        const messageElements = panel.querySelectorAll('p, div[class*="message"], div[class*="text"]');
        console.log(`Found ${messageElements.length} potential message elements`);
        
        let extracted = 0;
        for (const el of Array.from(messageElements)) {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && text.length < 500) {
            // Try to determine speaker
            const isPriya = text.includes('Priya') || el.closest('[class*="agent"]') || el.closest('[class*="interviewer"]');
            
            const message = {
              speaker: isPriya ? 'interviewer' : 'candidate',
              message: text,
              timestamp: new Date().toISOString()
            };
            
            // Check if not duplicate
            const exists = conversationLog.some(m => m.message === text);
            if (!exists) {
              setConversationLog(prev => [...prev, message]);
              
              await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
              });
              
              extracted++;
            }
          }
        }
        
        console.log(`✅ Extracted ${extracted} new messages`);
        alert(`✅ Extracted ${extracted} messages from conversation panel!`);
        return;
      }
    }
    
    console.log('⚠️ Could not find conversation panel');
    alert('⚠️ Could not find conversation panel. Please use manual entry.');
  };

  const extractUsingOCR = async () => {
    try {
      console.log('📸 Starting OCR extraction...');
      alert('📸 Please select the conversation panel area when prompted');
      
      // @ts-ignore - Dynamic import
      const html2canvas = (await import('html2canvas')).default;
      // @ts-ignore - Dynamic import
      const Tesseract = await import('tesseract.js');
      
      // Capture the entire screen
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        logging: false
      });
      
      console.log('📸 Screenshot captured, processing with OCR...');
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b: Blob | null) => {
          if (!b) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          resolve(b);
        }, 'image/png');
      });
      
      // Run OCR
      const worker = await Tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      
      console.log('✅ OCR completed');
      console.log('Extracted text:', text);
      
      // Parse the text to extract messages
      const lines = text.split('\n').filter((line: string) => line.trim().length > 10);
      
      let extracted = 0;
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip if too short or looks like UI text
        if (trimmedLine.length < 15 || 
            trimmedLine.includes('Conversation') || 
            trimmedLine.includes('Send a message') ||
            trimmedLine.includes('Online')) {
          continue;
        }
        
        // Determine speaker
        const isPriya = trimmedLine.includes('Priya') || 
                       lines.indexOf(line) % 2 === 0; // Alternate speakers
        
        const message = {
          speaker: isPriya ? 'interviewer' : 'candidate',
          message: trimmedLine,
          timestamp: new Date().toISOString()
        };
        
        // Check if not duplicate
        const exists = conversationLog.some(m => 
          m.message.toLowerCase().includes(trimmedLine.toLowerCase().substring(0, 30))
        );
        
        if (!exists) {
          setConversationLog(prev => [...prev, message]);
          
          await fetch(`http://localhost:8002/api/interview/add-message/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
          
          extracted++;
        }
      }
      
      console.log(`✅ OCR extracted ${extracted} messages`);
      alert(`✅ OCR extracted ${extracted} messages!\n\nPlease review and adjust if needed.`);
      
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      alert('❌ OCR extraction failed. Please use manual entry.');
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

      {/* Manual Conversation Capture Panel */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxWidth: '400px',
        display: showManualInput ? 'block' : 'none'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Conversation Capture
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
            Messages captured: {conversationLog.length}
          </div>
          
          <select 
            value={manualSpeaker}
            onChange={(e) => setManualSpeaker(e.target.value as 'interviewer' | 'candidate')}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="interviewer">Interviewer</option>
            <option value="candidate">Candidate</option>
          </select>
          
          <textarea
            value={manualMessage}
            onChange={(e) => setManualMessage(e.target.value)}
            placeholder="Enter message..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button
            onClick={addManualMessage}
            style={{
              padding: '10px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Message
          </button>
          
          <button
            onClick={extractUsingOCR}
            style={{
              padding: '10px',
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📸 Extract Using OCR (Screenshot)
          </button>
          
          <button
            onClick={extractFromConversationPanel}
            style={{
              padding: '10px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔍 Extract from DOM
          </button>
          
          <button
            onClick={addSampleConversation}
            style={{
              padding: '10px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Sample Conversation (Test)
          </button>
          
          <button
            onClick={() => setShowManualInput(false)}
            style={{
              padding: '10px',
              background: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Floating Action Button to Open Panel */}
      {!showManualInput && (
        <button
          onClick={() => setShowManualInput(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontSize: '24px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Manual Conversation Capture"
        >
          💬
        </button>
      )}
    </div>
  );
};

export default InterviewRoom;