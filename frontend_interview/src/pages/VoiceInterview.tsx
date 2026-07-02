import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, AlertCircle, Clock, Mic, ArrowLeft,
  ChevronRight, CheckCircle2, PlayCircle,
} from 'lucide-react';
import { sessionsApi } from '../api/sessions';
import type { InterviewSessionDetail, SessionStartResponse } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:     'bg-emerald-500/15 text-emerald-300',
  intermediate: 'bg-amber-500/15 text-amber-300',
  advanced:     'bg-rose-500/15 text-rose-300',
};

// ── Page ──────────────────────────────────────────────────────────────────────

const VoiceInterview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate       = useNavigate();

  const [session, setSession]         = useState<InterviewSessionDetail | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  const [isStarting, setIsStarting]   = useState(false);
  const [startError, setStartError]   = useState<string | null>(null);
  // Store start response so Phase 4 can use the LiveKit token
  const [startData, setStartData]     = useState<SessionStartResponse | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  // ── Load session ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const id = Number(sessionId);
    if (isNaN(id)) {
      setFetchError('Invalid session ID.');
      setIsLoading(false);
      return;
    }
    sessionsApi
      .getById(id)
      .then(setSession)
      .catch((err) => {
        setFetchError(err.response?.data?.detail || 'Session not found.');
      })
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!session) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const data = await sessionsApi.start(session.id);
      setStartData(data);
      // Refresh session state (now in_progress)
      setSession(data.session);
      // Phase 4 will connect the WebSocket here using data.livekit_token / data.livekit_url
    } catch (err: any) {
      setStartError(err.response?.data?.detail || 'Could not start interview. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!session) return;
    try {
      await sessionsApi.cancel(session.id);
      navigate('/sessions');
    } catch {
      navigate('/sessions');
    }
  };

  // ── Render: loading ───────────────────────────────────────────────────────
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

  // ── Render: error ─────────────────────────────────────────────────────────
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
  const isScheduled  = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const isCompleted  = session.status === 'completed';
  const isCancelled  = session.status === 'cancelled';

  // ── Render: completed ─────────────────────────────────────────────────────
  if (isCompleted) {
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
          <Link to="/sessions" className="btn-ghost w-full mt-3">
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: cancelled ─────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e] px-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-400 text-sm mb-4">This session was cancelled.</p>
          <Link to="/sessions" className="btn-ghost">Back to sessions</Link>
        </div>
      </div>
    );
  }

  // ── Render: scheduled or in_progress ─────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1e] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-[#1e2d45] bg-[#0a0f1e]/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/sessions" className="text-slate-500 hover:text-slate-300 transition" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 truncate">{room.title}</p>
            <p className="text-xs text-slate-500">{room.company || room.role}</p>
          </div>
          {isInProgress && (
            <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              <PlayCircle className="w-3.5 h-3.5" />
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Session card */}
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

            {room.description && (
              <p className="mt-4 text-sm text-slate-400 border-t border-[#1e2d45] pt-4">
                {room.description}
              </p>
            )}

            {room.competencies && room.competencies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {room.competencies.map((c: string) => (
                  <span key={c} className="badge bg-slate-700/50 text-slate-300 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Start error */}
          {startError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {startError}
            </div>
          )}

          {/* Actions */}
          {isScheduled && (
            <>
              <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 mb-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300 mb-1">Before you start</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Find a quiet place with a stable internet connection.</li>
                  <li>Allow microphone access when prompted.</li>
                  <li>Speak clearly — the AI interviewer will respond in real time.</li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="btn-primary w-full text-base py-3"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Interview
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="btn-ghost w-full mt-3"
              >
                Cancel session
              </button>
            </>
          )}

          {isInProgress && (
            <div className="text-center text-slate-400 text-sm py-4">
              <p className="mb-4">
                Your interview session is active.{' '}
                <span className="text-indigo-400 font-medium">Phase 4</span> will connect the live voice flow here.
              </p>
              <button onClick={handleStart} disabled={isStarting} className="btn-primary w-full">
                {isStarting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reconnecting…</> : 'Reconnect'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterview;
