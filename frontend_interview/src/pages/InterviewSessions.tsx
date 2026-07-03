import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, XCircle, PlayCircle, TimerIcon, Plus,
} from 'lucide-react';
import { sessionsApi } from '../api/sessions';
import { getErrorMessage } from '../api/client';
import type { InterviewSessionSummary, SessionStatus } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SessionStatus, {
  label: string;
  icon: React.FC<{ className?: string }>;
  style: string;
}> = {
  scheduled:   { label: 'Scheduled',   icon: TimerIcon,    style: 'bg-blue-500/15 text-blue-300' },
  in_progress: { label: 'In Progress', icon: PlayCircle,   style: 'bg-amber-500/15 text-amber-300' },
  completed:   { label: 'Completed',   icon: CheckCircle2, style: 'bg-emerald-500/15 text-emerald-300' },
  cancelled:   { label: 'Cancelled',   icon: XCircle,      style: 'bg-slate-600/40 text-slate-400' },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:     'bg-emerald-500/15 text-emerald-300',
  intermediate: 'bg-amber-500/15 text-amber-300',
  advanced:     'bg-rose-500/15 text-rose-300',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '—';
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Session row ───────────────────────────────────────────────────────────────

const SessionRow: React.FC<{ session: InterviewSessionSummary }> = ({ session }) => {
  const navigate = useNavigate();
  const cfg  = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.scheduled;
  const Icon = cfg.icon;

  const handleClick = () => {
    if (session.status === 'scheduled' || session.status === 'in_progress') {
      navigate(`/sessions/${session.id}`);
    } else if (session.status === 'completed') {
      navigate(`/sessions/${session.id}/report`);
    }
  };

  const isClickable = session.status !== 'cancelled';

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={`flex items-center gap-4 p-4 rounded-xl border border-[#1e2d45] bg-[#111827]
        transition-all
        ${isClickable
          ? 'hover:border-indigo-500/30 hover:bg-[#1a2235] cursor-pointer'
          : 'opacity-60 cursor-default'
        }`}
    >
      {/* Status icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.style}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>

      {/* Room info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-100 truncate text-sm">
          {session.room_template.title}
        </p>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-xs text-slate-500">
            {session.room_template.round_type_display}
          </span>
          <span className={`badge text-[11px] ${DIFFICULTY_STYLE[session.room_template.difficulty]}`}>
            {session.room_template.difficulty_display}
          </span>
          {session.room_template.company && (
            <span className="text-xs text-slate-500">{session.room_template.company}</span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(session.created_at)}
        </span>
        {session.ended_at && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(session.started_at, session.ended_at)}
          </span>
        )}
      </div>

      {/* Score or status badge */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className={`badge ${cfg.style} text-xs`}>{cfg.label}</span>
        {session.overall_score !== null && session.status === 'completed' && (
          <span className="text-sm font-bold text-indigo-300">
            {session.overall_score.toFixed(1)}<span className="text-xs text-slate-500">/10</span>
          </span>
        )}
      </div>

      {isClickable && (
        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const InterviewSessions: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions]   = useState<InterviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    sessionsApi
      .list()
      .then(setSessions)
      .catch((err: unknown) => {
        setError(getErrorMessage(err, 'Failed to load sessions.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Split into active (resumable) and past
  const active = sessions.filter((s) =>
    s.status === 'scheduled' || s.status === 'in_progress'
  );
  const past = sessions.filter((s) =>
    s.status === 'completed' || s.status === 'cancelled'
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Sessions</h1>
          <p className="text-slate-400 text-sm mt-1">Your interview history and active sessions.</p>
        </div>
        <button
          onClick={() => navigate('/rooms')}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New session
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading sessions…
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <AlertCircle className="w-7 h-7 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
          <Calendar className="w-10 h-10" />
          <p className="text-base font-medium text-slate-400">No sessions yet</p>
          <p className="text-sm">Pick a room and start your first interview.</p>
          <Link to="/rooms" className="btn-primary mt-2">
            Browse rooms
          </Link>
        </div>
      )}

      {/* Active / resumable sessions */}
      {!isLoading && !error && active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Active
          </h2>
          <div className="flex flex-col gap-2">
            {active.map((s) => <SessionRow key={s.id} session={s} />)}
          </div>
        </section>
      )}

      {/* Past sessions */}
      {!isLoading && !error && past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            History
          </h2>
          <div className="flex flex-col gap-2">
            {past.map((s) => <SessionRow key={s.id} session={s} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default InterviewSessions;
