import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, LayoutGrid, TrendingUp, ArrowRight,
  CheckCircle2, PlayCircle, TimerIcon, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sessionsApi } from '../api/sessions';
import type { InterviewSessionSummary, SessionStatus } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<SessionStatus, string> = {
  scheduled:   'bg-blue-500/15 text-blue-300',
  in_progress: 'bg-amber-500/15 text-amber-300',
  completed:   'bg-emerald-500/15 text-emerald-300',
  cancelled:   'bg-slate-600/40 text-slate-400',
};

const STATUS_ICON: Record<SessionStatus, React.FC<{ className?: string }>> = {
  scheduled:   TimerIcon,
  in_progress: PlayCircle,
  completed:   CheckCircle2,
  cancelled:   () => null,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const user = authState.user;

  const [recentSessions, setRecentSessions] = useState<InterviewSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    sessionsApi
      .list()
      .then((all) => setRecentSessions(all.slice(0, 5)))
      .catch(() => {/* silently ignore on dashboard */})
      .finally(() => setSessionsLoading(false));
  }, []);

  // Aggregate stats from real data
  const completed = recentSessions.filter((s) => s.status === 'completed');
  const scored    = completed.filter((s) => s.overall_score !== null);
  const avgScore  = scored.length
    ? (scored.reduce((sum, s) => sum + s.overall_score!, 0) / scored.length).toFixed(1)
    : null;

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">
          Welcome back,{' '}
          <span className="text-indigo-400">{user?.first_name || 'there'}</span>
        </h1>
        <p className="text-slate-400 mt-1">Ready to ace your next interview?</p>
      </div>

      {/* Email verification banner */}
      {user && !user.is_email_verified && (
        <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
          <span className="shrink-0">⚠</span>
          <span>
            Your email isn't verified yet.{' '}
            <Link to="/verify-email" className="underline hover:text-amber-200">
              Resend link
            </Link>
          </span>
        </div>
      )}

      {/* Stats row */}
      {!sessionsLoading && recentSessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{recentSessions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total sessions</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{completed.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Completed</p>
          </div>
          <div className="card py-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-indigo-400">
              {avgScore ? `${avgScore}/10` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Avg score</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to="/rooms"
          className="group card hover:border-indigo-500/40 hover:bg-[#1a2235] transition cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-indigo-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Browse Rooms</h3>
          <p className="text-sm text-slate-400">Choose a room and start a new session.</p>
        </Link>

        <Link
          to="/sessions"
          className="group card hover:border-indigo-500/40 hover:bg-[#1a2235] transition cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">My Sessions</h3>
          <p className="text-sm text-slate-400">Review your past interviews and reports.</p>
        </Link>

        <div className="card opacity-60 cursor-default">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Progress</h3>
          <p className="text-sm text-slate-400">Analytics coming soon.</p>
        </div>
      </div>

      {/* Recent sessions */}
      {!sessionsLoading && recentSessions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Recent Sessions
            </h2>
            <Link
              to="/sessions"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s) => {
              const Icon = STATUS_ICON[s.status];
              const isClickable = s.status !== 'cancelled';
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!isClickable) return;
                    if (s.status === 'completed') navigate(`/sessions/${s.id}/report`);
                    else navigate(`/sessions/${s.id}`);
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all
                    ${isClickable
                      ? 'hover:bg-[#1a2235] cursor-pointer'
                      : 'opacity-50 cursor-default'
                    }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${STATUS_STYLE[s.status]}`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {s.room_template.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.room_template.round_type_display} · {formatDate(s.created_at)}
                    </p>
                  </div>
                  {s.overall_score !== null && (
                    <span className="text-sm font-bold text-indigo-300 shrink-0">
                      {s.overall_score.toFixed(1)}
                    </span>
                  )}
                  {isClickable && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account card */}
      <div className="card mt-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
            {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-100">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-sm text-slate-400 truncate">{user?.email}</p>
            {user?.profile?.skill_level && (
              <span className="inline-block mt-1 badge bg-indigo-600/20 text-indigo-300 capitalize">
                {user.profile.skill_level}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
