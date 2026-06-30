import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * VoiceInterview — full WebSocket interview room.
 * Implemented in Phase 3.
 */
const VoiceInterview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Interview Room</h1>
        <p className="text-slate-400">Session {sessionId} — Coming in Phase 3</p>
      </div>
    </div>
  );
};

export default VoiceInterview;
