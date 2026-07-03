import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, AlertCircle, Clock, Mic, MicOff, ArrowLeft,
  ChevronRight, CheckCircle2, PhoneOff, Wifi, WifiOff,
  Volume2, VolumeX,
} from 'lucide-react';
import { sessionsApi } from '../api/sessions';
import { tokenStorage, getErrorMessage } from '../api/client';
import { useInterviewSocket } from '../hooks/useInterviewSocket';
import type { TurnHistoryEntry } from '../hooks/useInterviewSocket';
import type { InterviewSessionDetail, SessionStartResponse } from '../types';

// ── Design helpers ────────────────────────────────────────────────────────────

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:     'bg-emerald-500/15 text-emerald-300',
  intermediate: 'bg-amber-500/15 text-amber-300',
  advanced:     'bg-rose-500/15 text-rose-300',
};

// ── Interviewer avatar ────────────────────────────────────────────────────────
// Animated circle reflecting thinking / speaking / idle states

interface AvatarProps {
  name: string;
  isThinking: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
}

const InterviewerAvatar: React.FC<AvatarProps> = ({
  name, isThinking, isSpeaking, isConnecting,
}) => {
  const initial = name?.[0]?.toUpperCase() ?? 'AI';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Outer pulse ring — only while speaking */}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
        )}
        {/* Second slower ring while thinking */}
        {isThinking && (
          <span className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-pulse" />
        )}
        <div className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          text-lg font-bold transition-all duration-300
          ${isConnecting
            ? 'bg-slate-700 text-slate-500'
            : isThinking
              ? 'bg-indigo-600/30 border-2 border-indigo-500/40 text-indigo-300'
              : isSpeaking
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
          }
        `}>
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : initial}
        </div>
      </div>

      {/* State label */}
      <p className="text-xs text-slate-500 h-4">
        {isConnecting ? 'Connecting…'
          : isThinking  ? 'Thinking…'
          : isSpeaking  ? 'Speaking'
          : name || 'AI Interviewer'}
      </p>
    </div>
  );
};

// ── Audio visualiser ──────────────────────────────────────────────────────────
// Reads real amplitude from the mic stream while recording.

interface VisualiserProps {
  stream: MediaStream | null;
  isActive: boolean;
}

const AudioVisualiser: React.FC<VisualiserProps> = ({ stream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const ctxRef    = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    ctxRef.current = audioCtx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const draw = () => {
      analyser.getByteFrequencyData(data);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / data.length;
      data.forEach((val, i) => {
        const h = (val / 255) * canvas.height;
        const alpha = 0.4 + (val / 255) * 0.6;
        ctx2d.fillStyle = `rgba(239,68,68,${alpha})`;
        ctx2d.fillRect(i * barW, canvas.height - h, barW - 1, h);
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtx.close();
    };
  }, [isActive, stream]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="rounded opacity-80"
      aria-hidden="true"
    />
  );
};

// ── Turn history log ──────────────────────────────────────────────────────────

const TurnHistory: React.FC<{ entries: TurnHistoryEntry[] }> = ({ entries }) => {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.turnNumber} className="rounded-xl border border-[#1e2d45] overflow-hidden opacity-70">
          {/* Question */}
          <div className="px-4 py-2.5 bg-[#111827]">
            <p className="text-xs text-indigo-400 font-medium mb-1">
              Q{entry.turnNumber + 1}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{entry.question}</p>
          </div>
          {/* Answer */}
          {entry.answer && (
            <div className="px-4 py-2.5 bg-[#0a0f1e] border-t border-[#1e2d45]">
              <p className="text-xs text-slate-500 font-medium mb-1">Your answer</p>
              <p className="text-sm text-slate-400 leading-relaxed">{entry.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Lobby ─────────────────────────────────────────────────────────────────────

interface LobbyProps {
  session: InterviewSessionDetail;
  onStart: () => Promise<void>;
  onCancel: () => void;
  isStarting: boolean;
  startError: string | null;
}

const Lobby: React.FC<LobbyProps> = ({ session, onStart, onCancel, isStarting, startError }) => {
  const room = session.room_template;
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="card mb-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/15 flex items-center justify-center shrink-0">
              <Mic className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">{room.title}</h2>
              <p className="text-slate-400 text-sm">{room.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#0a0f1e] rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Type</p>
              <p className="text-slate-200">{room.round_type_display}</p>
            </div>
            <div className="bg-[#0a0f1e] rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Difficulty</p>
              <span className={`badge ${DIFFICULTY_STYLE[room.difficulty]}`}>
                {room.difficulty_display}
              </span>
            </div>
            <div className="bg-[#0a0f1e] rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Duration</p>
              <p className="text-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                ~{room.duration_minutes} min
              </p>
            </div>
            {room.interviewer_name && (
              <div className="bg-[#0a0f1e] rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Interviewer</p>
                <p className="text-slate-200">{room.interviewer_name}</p>
              </div>
            )}
          </div>
          {room.competencies?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {room.competencies.map((c: string) => (
                <span key={c} className="badge bg-slate-700/50 text-slate-300 text-xs">{c}</span>
              ))}
            </div>
          )}
        </div>
        {startError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {startError}
          </div>
        )}
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 mb-4 text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-2">Before you start</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Find a quiet place with a stable internet connection.</li>
            <li>Allow microphone access when prompted.</li>
            <li>Hold the mic button to speak your answer, release when done.</li>
          </ul>
        </div>
        <button onClick={onStart} disabled={isStarting} className="btn-primary w-full text-base py-3">
          {isStarting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
            : <><Mic className="w-4 h-4" /> Start Interview</>}
        </button>
        <button onClick={onCancel} className="btn-ghost w-full mt-3">Cancel session</button>
      </div>
    </div>
  );
};

// ── Live interview room ───────────────────────────────────────────────────────

interface LiveRoomProps {
  sessionId: number;
  accessToken: string;
  interviewerName: string;
  onSessionEnded: (endedId: number) => void;
}

const LiveRoom: React.FC<LiveRoomProps> = ({
  sessionId, accessToken, interviewerName, onSessionEnded,
}) => {
  const {
    state: ws,
    connect,
    requestMic,
    startRecording,
    stopRecording,
    endSession,
    clearWarning,
    cancelSpeech,
  } = useInterviewSocket(sessionId, accessToken);

  // Expose the mic stream so AudioVisualiser can read it
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  // TTS mute preference (persisted per session in memory)
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    const init = async () => {
      connect();
      // requestMic acquires the stream once and stores it in the hook's ref.
      // We capture the returned stream here for the AudioVisualiser.
      const stream = await requestMic();
      if (stream) setMicStream(stream);
    };
    init();
  }, [connect, requestMic]);

  // Mute/unmute TTS
  useEffect(() => {
    if (!ttsEnabled) cancelSpeech();
  }, [ttsEnabled, cancelSpeech]);

  useEffect(() => {
    if (ws.sessionEnded && ws.endedSessionId !== null) {
      onSessionEnded(ws.endedSessionId);
    }
  }, [ws.sessionEnded, ws.endedSessionId, onSessionEnded]);

  const handleMicDown = useCallback(() => {
    if (!ws.micGranted || ws.isThinking || ws.isSpeaking || !ws.currentQuestion) return;
    cancelSpeech();   // stop TTS if user starts speaking
    startRecording();
  }, [ws.micGranted, ws.isThinking, ws.isSpeaking, ws.currentQuestion, cancelSpeech, startRecording]);

  const handleMicUp = useCallback(() => {
    if (!ws.isRecording) return;
    stopRecording();
  }, [ws.isRecording, stopRecording]);

  const progress  = ws.totalTurns > 0 ? Math.round((ws.turnNumber / ws.totalTurns) * 100) : 0;
  const isConnecting = ws.connectionStatus === 'connecting';

  const canRecord = ws.connectionStatus === 'connected'
    && ws.micGranted
    && !ws.isThinking
    && !ws.isSpeaking
    && ws.currentQuestion !== null
    && !ws.isRecording;

  if (ws.fatalError) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mb-4 mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="font-semibold text-slate-100 mb-2">Connection error</p>
          <p className="text-slate-400 text-sm mb-6">{ws.fatalError}</p>
          <Link to="/sessions" className="btn-ghost">Back to sessions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-5 gap-4">

      {/* ── Top bar: connection + progress + controls ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {ws.connectionStatus === 'connected'
            ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            : <WifiOff className="w-3.5 h-3.5 text-slate-500" />}
          <span className={ws.connectionStatus === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>
            {isConnecting ? 'Connecting…' : ws.connectionStatus}
          </span>
        </div>

        {ws.totalTurns > 0 && (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0 tabular-nums">
              {ws.turnNumber + 1}/{ws.totalTurns}
            </span>
          </div>
        )}

        {/* TTS toggle */}
        {'speechSynthesis' in window && (
          <button
            onClick={() => setTtsEnabled(v => !v)}
            title={ttsEnabled ? 'Mute interviewer voice' : 'Unmute interviewer voice'}
            className="text-slate-500 hover:text-slate-300 transition"
            aria-label={ttsEnabled ? 'Mute' : 'Unmute'}
          >
            {ttsEnabled
              ? <Volume2 className="w-4 h-4" />
              : <VolumeX className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={endSession}
          title="End interview"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 border border-[#1e2d45] hover:border-red-500/30 rounded-lg px-3 py-1.5 transition"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End
        </button>
      </div>

      {/* ── Recoverable warning ── */}
      {ws.warning && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{ws.warning}</span>
          <button onClick={clearWarning} className="text-amber-300/60 hover:text-amber-300 transition">✕</button>
        </div>
      )}

      {/* ── Interviewer avatar ── */}
      <div className="flex justify-center py-2">
        <InterviewerAvatar
          name={interviewerName}
          isThinking={ws.isThinking}
          isSpeaking={ws.isSpeaking}
          isConnecting={isConnecting}
        />
      </div>

      {/* ── Turn history (collapsed past Q&As) ── */}
      <TurnHistory entries={ws.turnHistory} />

      {/* ── Current question card ── */}
      <div className="card min-h-[100px] flex items-start justify-start">
        {isConnecting && (
          <div className="flex items-center gap-2 text-slate-500 m-auto">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">Connecting to interview server…</p>
          </div>
        )}
        {!isConnecting && ws.isThinking && (
          <div className="flex flex-col items-center gap-2 text-slate-500 m-auto">
            <div className="flex gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <p className="text-sm">Preparing next question…</p>
          </div>
        )}
        {!isConnecting && !ws.isThinking && ws.currentQuestion && (
          <p className="text-slate-100 text-base leading-relaxed">{ws.currentQuestion}</p>
        )}
        {!isConnecting && !ws.isThinking && !ws.currentQuestion && ws.connectionStatus === 'connected' && (
          <p className="text-slate-500 text-sm m-auto">Waiting for the interview to begin…</p>
        )}
      </div>

      {/* ── Transcript ── */}
      {(ws.transcriptPartial || ws.transcriptFinal) && (
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1.5">
            {ws.transcriptFinal ? 'Your answer' : 'Transcribing…'}
          </p>
          <p className={`text-sm leading-relaxed ${
            ws.transcriptFinal ? 'text-slate-200' : 'text-slate-400 italic'
          }`}>
            {ws.transcriptFinal || ws.transcriptPartial}
          </p>
        </div>
      )}

      {/* ── Mic button + visualiser ── */}
      <div className="flex flex-col items-center gap-3 mt-auto pb-4">
        {!ws.micGranted && (
          <p className="text-xs text-amber-300 text-center">
            Microphone access required — please allow it in your browser.
          </p>
        )}

        {/* Visualiser bar sits above the button */}
        <AudioVisualiser stream={micStream} isActive={ws.isRecording} />

        <button
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onTouchStart={handleMicDown}
          onTouchEnd={handleMicUp}
          disabled={!canRecord && !ws.isRecording}
          aria-label={ws.isRecording ? 'Release to submit answer' : 'Hold to speak'}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-150 select-none
            focus:outline-none focus:ring-4 focus:ring-indigo-500/40
            ${ws.isRecording
              ? 'bg-red-500 shadow-lg shadow-red-500/40 scale-110'
              : canRecord
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-95'
                : 'bg-slate-700 opacity-40 cursor-not-allowed'
            }
          `}
        >
          {ws.isRecording
            ? <MicOff className="w-8 h-8 text-white" />
            : <Mic    className="w-8 h-8 text-white" />}
          {ws.isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          )}
        </button>

        <p className="text-xs text-slate-500 h-4">
          {ws.isRecording   ? 'Release to submit answer'
            : ws.isSpeaking ? 'Interviewer is speaking…'
            : ws.isThinking ? 'Please wait…'
            : canRecord     ? 'Hold to speak'
            : ''}
        </p>
      </div>

    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const VoiceInterview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate       = useNavigate();

  const [session, setSession]         = useState<InterviewSessionDetail | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [isStarting, setIsStarting]   = useState(false);
  const [startError, setStartError]   = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const numericId = sessionId ? Number(sessionId) : null;

  useEffect(() => {
    if (!numericId || isNaN(numericId)) {
      setFetchError('Invalid session ID.');
      setIsLoading(false);
      return;
    }
    sessionsApi
      .getById(numericId)
      .then((s) => {
        setSession(s);
        if (s.status === 'in_progress') setAccessToken(tokenStorage.getAccess());
      })
      .catch((err: unknown) => setFetchError(getErrorMessage(err, 'Session not found.')))
      .finally(() => setIsLoading(false));
  }, [numericId]);

  const handleStart = useCallback(async () => {
    if (!session) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const data: SessionStartResponse = await sessionsApi.start(session.id);
      setSession(data.session);
      setAccessToken(tokenStorage.getAccess());
    } catch (err: unknown) {
      setStartError(getErrorMessage(err, 'Could not start interview. Please try again.'));
    } finally {
      setIsStarting(false);
    }
  }, [session]);

  const handleCancel = useCallback(async () => {
    if (!session) return;
    try { await sessionsApi.cancel(session.id); } catch { /* ignore */ }
    navigate('/sessions');
  }, [session, navigate]);

  const handleSessionEnded = useCallback((endedId: number) => {
    navigate(`/sessions/${endedId}/report`, { replace: true });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Loading session…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !session) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e] px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-slate-200 font-medium mb-2">Session not found</p>
          <p className="text-slate-400 text-sm mb-6">{fetchError}</p>
          <Link to="/sessions" className="btn-primary">Back to sessions</Link>
        </div>
      </div>
    );
  }

  const room = session.room_template;

  if (session.status === 'completed') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e] px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Interview complete</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your report is being generated. It'll be ready shortly.
          </p>
          <Link to={`/sessions/${session.id}/report`} className="btn-primary w-full">
            View Report <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/sessions" className="btn-ghost w-full mt-3">Back to sessions</Link>
        </div>
      </div>
    );
  }

  if (session.status === 'cancelled') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e] px-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-400 text-sm mb-4">This session was cancelled.</p>
          <Link to="/sessions" className="btn-ghost">Back to sessions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1e] flex flex-col">
      {/* Sticky top bar */}
      <div className="border-b border-[#1e2d45] bg-[#0a0f1e]/80 backdrop-blur-sm sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/sessions" className="text-slate-500 hover:text-slate-300 transition" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 truncate">{room.title}</p>
            <p className="text-xs text-slate-500">{room.company || room.role}</p>
          </div>
        </div>
      </div>

      {session.status === 'scheduled' && (
        <Lobby
          session={session}
          onStart={handleStart}
          onCancel={handleCancel}
          isStarting={isStarting}
          startError={startError}
        />
      )}

      {session.status === 'in_progress' && accessToken && (
        <LiveRoom
          sessionId={session.id}
          accessToken={accessToken}
          interviewerName={room.interviewer_name}
          onSessionEnded={handleSessionEnded}
        />
      )}

      {session.status === 'in_progress' && !accessToken && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default VoiceInterview;
