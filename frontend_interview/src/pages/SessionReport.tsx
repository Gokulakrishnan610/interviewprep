import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, ThumbsUp, ThumbsDown, Lightbulb,
  BarChart3, RefreshCw, ChevronDown, ChevronUp,
  MessageSquare,
} from 'lucide-react';
import axios from 'axios';
import { sessionsApi } from '../api/sessions';
import type {
  FeedbackReport,
  InterviewSessionDetail,
  ReportGenerationStatus,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract numeric dimension scores, stripping the nested hf_competency_scores sub-object */
function getNumericDimensions(
  dimensionScores: Record<string, number | Record<string, number>>
): Array<{ name: string; score: number }> {
  return Object.entries(dimensionScores)
    .filter(([key, val]) => key !== 'hf_competency_scores' && typeof val === 'number')
    .map(([key, val]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      score: val as number,
    }))
    .sort((a, b) => b.score - a.score);
}

function scoreColor(score: number, max = 10): string {
  const pct = score / max;
  if (pct >= 0.75) return 'text-emerald-400';
  if (pct >= 0.5)  return 'text-amber-400';
  return 'text-rose-400';
}

function scoreBg(score: number, max = 10): string {
  const pct = score / max;
  if (pct >= 0.75) return 'bg-emerald-500';
  if (pct >= 0.5)  return 'bg-amber-500';
  return 'bg-rose-500';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '';
  const mins = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000
  );
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated radial score gauge */
const ScoreGauge: React.FC<{ score: number | null; max?: number }> = ({
  score, max = 10,
}) => {
  const safe   = score ?? 0;
  const pct    = Math.min(safe / max, 1);
  const radius = 52;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ * pct;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e2d45" strokeWidth="10" />
          {/* Fill */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {score !== null ? (
            <>
              <span className={`text-3xl font-bold ${scoreColor(safe)}`}>
                {safe.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">/ {max}</span>
            </>
          ) : (
            <span className="text-slate-500 text-sm">N/A</span>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-slate-300 mt-2">Overall Score</p>
    </div>
  );
};

/** Horizontal bar for a single dimension */
const DimensionBar: React.FC<{ name: string; score: number; max?: number }> = ({
  name, score, max = 10,
}) => {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-300">{name}</span>
        <span className={`text-sm font-semibold ${scoreColor(score, max)}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-[#1e2d45] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreBg(score, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/** Expandable Q&A turn */
const TurnCard: React.FC<{ turn: InterviewSessionDetail['turns'][number]; index: number }> = ({
  turn, index,
}) => {
  const [open, setOpen] = useState(false);
  const hasAnswer = Boolean(turn.answer_text?.trim());

  return (
    <div className="border border-[#1e2d45] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-[#1a2235] transition"
      >
        <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <p className="flex-1 text-sm text-slate-200 leading-relaxed">{turn.question_text}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#1e2d45]">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Your answer
          </div>
          {hasAnswer ? (
            <p className="text-sm text-slate-300 leading-relaxed">{turn.answer_text}</p>
          ) : (
            <p className="text-sm text-slate-500 italic">No answer recorded.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Pending/Generating screen ─────────────────────────────────────────────────

interface PendingScreenProps {
  status: ReportGenerationStatus;
  error: string | null;
  onRetry: () => void;
}

const PendingScreen: React.FC<PendingScreenProps> = ({ status, error, onRetry }) => (
  <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
    {status === 'failed' ? (
      <>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-100 mb-1">Report generation failed</p>
          <p className="text-slate-400 text-sm max-w-sm">
            {error || 'An error occurred while generating your feedback report.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRetry} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link to="/sessions" className="btn-ghost">Back to sessions</Link>
        </div>
      </>
    ) : (
      <>
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-100 mb-1">Generating your report…</p>
          <p className="text-slate-400 text-sm">
            {status === 'running'
              ? 'Analysing your answers with AI. This usually takes 15–30 seconds.'
              : 'Queued for generation. Please wait a moment.'}
          </p>
        </div>
        <p className="text-xs text-slate-600">This page will update automatically.</p>
        <Link to="/sessions" className="btn-ghost text-xs">Back to sessions</Link>
      </>
    )}
  </div>
);

// ── Full report ───────────────────────────────────────────────────────────────

interface ReportViewProps {
  report: FeedbackReport;
  session: InterviewSessionDetail;
}

const ReportView: React.FC<ReportViewProps> = ({ report, session }) => {
  const room       = session.room_template;
  const dimensions = getNumericDimensions(report.dimension_scores);
  const duration   = formatDuration(session.started_at, session.ended_at);

  return (
    <div className="page-container max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
          <Link to="/sessions" className="hover:text-slate-300 transition flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Sessions
          </Link>
          <span>/</span>
          <span className="text-slate-300">Report</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">{room.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
          {room.company && <span>{room.company}</span>}
          <span>{room.round_type_display}</span>
          {duration && <span>· {duration}</span>}
          <span>· {formatDate(report.created_at)}</span>
        </div>
      </div>

      {/* Score + dimensions side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 mb-6">
        {/* Gauge */}
        <div className="card flex items-center justify-center py-8 md:py-6">
          <ScoreGauge score={report.overall_score} />
        </div>

        {/* Dimension bars */}
        {dimensions.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Dimension Scores
              </h2>
            </div>
            <div className="space-y-4">
              {dimensions.map((d) => (
                <DimensionBar key={d.name} name={d.name} score={d.score} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strengths */}
      {report.strengths.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Strengths
            </h2>
          </div>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {report.weaknesses.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Areas for Improvement
            </h2>
          </div>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <TrendingUp className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Recommendations
            </h2>
          </div>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview transcript */}
      {session.turns.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Interview Transcript
          </h2>
          <div className="space-y-2">
            {session.turns.map((turn, i) => (
              <TurnCard key={turn.id} turn={turn} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pb-8">
        <Link to="/rooms" className="btn-primary">
          Start another interview
        </Link>
        <Link to="/sessions" className="btn-ghost">
          Back to sessions
        </Link>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const SessionReport: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericId      = sessionId ? Number(sessionId) : null;

  const [session, setSession]     = useState<InterviewSessionDetail | null>(null);
  const [report, setReport]       = useState<FeedbackReport | null>(null);
  const [genStatus, setGenStatus] = useState<ReportGenerationStatus>('pending');
  const [genError, setGenError]   = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable ref so the setInterval callback always calls the latest pollStatus
  const pollStatusRef = useRef<((id: number) => Promise<void>) | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const tryFetchReport = useCallback(async (id: number): Promise<boolean> => {
    try {
      const r = await sessionsApi.getReport(id);
      setReport(r);
      setGenStatus('done');
      stopPolling();
      return true;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) return false; // not ready yet
        setFetchError(err.response?.data?.detail || 'Failed to load report.');
      } else {
        setFetchError('Failed to load report.');
      }
      stopPolling();
      return false;
    }
  }, [stopPolling]);

  const pollStatus = useCallback(async (id: number) => {
    try {
      const s = await sessionsApi.getReportStatus(id);
      setGenStatus(s.status);
      if (s.status === 'done') {
        stopPolling();
        await tryFetchReport(id);
      } else if (s.status === 'failed') {
        setGenError(s.error || null);
        stopPolling();
      }
    } catch {
      // Silently ignore transient poll errors — interval will retry
    }
  }, [stopPolling, tryFetchReport]);

  // Keep the ref in sync so the interval always uses the latest version
  useEffect(() => {
    pollStatusRef.current = pollStatus;
  }, [pollStatus]);

  // ── Load session + report ─────────────────────────────────────────────────
  useEffect(() => {
    if (!numericId || isNaN(numericId)) {
      setFetchError('Invalid session ID.');
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const s = await sessionsApi.getById(numericId);
        setSession(s);

        const gotReport = await tryFetchReport(numericId);

        if (!gotReport) {
          const s2 = await sessionsApi.getReportStatus(numericId);
          setGenStatus(s2.status);

          if (s2.status === 'done') {
            await tryFetchReport(numericId);
          } else if (s2.status === 'failed') {
            setGenError(s2.error || null);
          } else {
            // Use the stable ref so the interval always calls the latest closure
            pollTimerRef.current = setInterval(
              () => pollStatusRef.current?.(numericId),
              3000,
            );
          }
        }
      } catch (err: unknown) {
        const detail = axios.isAxiosError(err)
          ? err.response?.data?.detail
          : undefined;
        setFetchError(detail || 'Session not found.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return () => stopPolling();
  }, [numericId, tryFetchReport, stopPolling]);

  const handleRetry = async () => {
    if (!numericId) return;
    setGenStatus('pending');
    setGenError(null);
    try {
      await sessionsApi.generateReport(numericId);
      pollTimerRef.current = setInterval(
        () => pollStatusRef.current?.(numericId),
        3000,
      );
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.detail
        : undefined;
      setGenError(detail || 'Could not trigger report generation.');
      setGenStatus('failed');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  // ── Fetch error (session not found) ──────────────────────────────────────
  if (fetchError || !session) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="font-semibold text-slate-100">Could not load session</p>
        <p className="text-slate-400 text-sm">{fetchError}</p>
        <Link to="/sessions" className="btn-primary">Back to sessions</Link>
      </div>
    );
  }

  // ── Report not ready yet ──────────────────────────────────────────────────
  if (!report) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1e]">
        <PendingScreen
          status={genStatus}
          error={genError}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // ── Full report ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0f1e]">
      <ReportView report={report} session={session} />
    </div>
  );
};

export default SessionReport;
