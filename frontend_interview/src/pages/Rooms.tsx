import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Clock, ChevronRight, X, Loader2,
  Mic, Code2, Layout, Users, Briefcase, Shuffle,
  AlertCircle,
} from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { sessionsApi } from '../api/sessions';
import { getErrorMessage } from '../api/client';
import type { RoomTemplate } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUND_TYPE_OPTIONS = [
  { value: '',              label: 'All types' },
  { value: 'behavioral',   label: 'Behavioral' },
  { value: 'technical',    label: 'Technical' },
  { value: 'system_design',label: 'System Design' },
  { value: 'hr',           label: 'HR' },
  { value: 'mixed',        label: 'Mixed' },
];

const DIFFICULTY_OPTIONS = [
  { value: '',             label: 'All levels' },
  { value: 'beginner',    label: 'Beginner' },
  { value: 'intermediate',label: 'Intermediate' },
  { value: 'advanced',    label: 'Advanced' },
];

const ROUND_ICON: Record<string, React.FC<{ className?: string }>> = {
  behavioral:   Mic,
  technical:    Code2,
  system_design:Layout,
  hr:           Users,
  mixed:        Shuffle,
};

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:     'bg-emerald-500/15 text-emerald-300',
  intermediate: 'bg-amber-500/15 text-amber-300',
  advanced:     'bg-rose-500/15 text-rose-300',
};

// ── Confirm-start modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  room: RoomTemplate;
  onConfirm: () => void;
  onCancel: () => void;
  isStarting: boolean;
  error: string | null;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  room, onConfirm, onCancel, isStarting, error,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-title"
  >
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-7 w-full max-w-md shadow-2xl">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 id="confirm-title" className="text-lg font-bold text-slate-100">
            Start interview?
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Review the details below</p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-300 transition"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Room summary */}
      <div className="rounded-xl bg-[#0a0f1e] border border-[#1e2d45] p-4 mb-5 space-y-2 text-sm">
        <p className="font-semibold text-slate-100 text-base">{room.title}</p>
        {room.company && (
          <p className="text-slate-400">
            <span className="text-slate-500">Company:</span> {room.company}
          </p>
        )}
        <p className="text-slate-400">
          <span className="text-slate-500">Role:</span> {room.role}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Type:</span> {room.round_type_display}
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Difficulty:</span>{' '}
          <span className={`badge ${DIFFICULTY_STYLE[room.difficulty]}`}>
            {room.difficulty_display}
          </span>
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">Duration:</span> ~{room.duration_minutes} min
        </p>
        {room.interviewer_name && (
          <p className="text-slate-400">
            <span className="text-slate-500">Interviewer:</span> {room.interviewer_name}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2.5 text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isStarting}
          className="btn-ghost flex-1"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isStarting}
          className="btn-primary flex-1"
        >
          {isStarting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating…
            </>
          ) : (
            'Start session'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Room card ─────────────────────────────────────────────────────────────────

const RoomCard: React.FC<{
  room: RoomTemplate;
  onSelect: (r: RoomTemplate) => void;
}> = ({ room, onSelect }) => {
  const Icon = ROUND_ICON[room.round_type] ?? Briefcase;

  return (
    <button
      onClick={() => onSelect(room)}
      className="text-left group card hover:border-indigo-500/40 hover:bg-[#1a2235] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`badge ${DIFFICULTY_STYLE[room.difficulty]}`}>
            {room.difficulty_display}
          </span>
          <span className="badge bg-slate-700/50 text-slate-300">
            {room.round_type_display}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2">
        {room.title}
      </h3>

      {/* Company / role */}
      {(room.company || room.role) && (
        <p className="text-xs text-slate-500 mb-2">
          {[room.company, room.role].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Description */}
      {room.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-4">{room.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1e2d45]">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          ~{room.duration_minutes} min
        </div>
        <div className="flex items-center gap-1 text-xs text-indigo-400 font-medium group-hover:gap-2 transition-all">
          Start
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Rooms: React.FC = () => {
  const navigate = useNavigate();

  const [rooms, setRooms]         = useState<RoomTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters (client-side — data set is small)
  const [search, setSearch]         = useState('');
  const [roundType, setRoundType]   = useState('');
  const [difficulty, setDifficulty] = useState('');

  // Session creation state
  const [selected, setSelected]     = useState<RoomTemplate | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fetch all rooms on mount
  useEffect(() => {
    setIsLoading(true);
    roomsApi
      .list()
      .then(setRooms)
      .catch((err: unknown) => {
        setFetchError(getErrorMessage(err, 'Failed to load rooms. Please try again.'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Client-side filter (avoids extra round-trips for a typical small list)
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rooms.filter((r) => {
      if (roundType && r.round_type !== roundType) return false;
      if (difficulty && r.difficulty !== difficulty) return false;
      if (q && ![r.title, r.description, r.company, r.role]
            .some((s) => s?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rooms, search, roundType, difficulty]);

  // Grouped by round type for visual hierarchy
  const grouped = useMemo(() => {
    const map = new Map<string, RoomTemplate[]>();
    filtered.forEach((r) => {
      if (!map.has(r.round_type_display)) map.set(r.round_type_display, []);
      map.get(r.round_type_display)!.push(r);
    });
    return map;
  }, [filtered]);

  const handleSelect = (room: RoomTemplate) => {
    setSelected(room);
    setStartError(null);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setIsStarting(true);
    setStartError(null);
    try {
      // 1. Create the session from the room template
      const session = await sessionsApi.create(selected.id);
      // 2. Navigate to the interview room with the real session id
      navigate(`/sessions/${session.id}`);
    } catch (err: unknown) {
      setStartError(getErrorMessage(err, 'Could not create session. Please try again.'));
    } finally {
      setIsStarting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoundType('');
    setDifficulty('');
  };

  const hasFilters = search !== '' || roundType !== '' || difficulty !== '';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Interview Rooms</h1>
          <p className="text-slate-400 text-sm mt-1">
            Pick a room to start a new interview session.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms…"
              className="input pl-9 h-10"
            />
          </div>

          {/* Round type */}
          <select
            value={roundType}
            onChange={(e) => setRoundType(e.target.value)}
            className="input h-10 w-auto pr-8"
          >
            {ROUND_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Difficulty */}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input h-10 w-auto pr-8"
          >
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost h-10 px-3 text-xs">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading rooms…
          </div>
        )}

        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm">{fetchError}</p>
            <button
              onClick={() => {
                setFetchError(null);
                setIsLoading(true);
                roomsApi
                  .list()
                  .then(setRooms)
                  .catch((err: unknown) => {
                    setFetchError(
                      getErrorMessage(err, 'Failed to load rooms. Please try again.')
                    );
                  })
                  .finally(() => setIsLoading(false));
              }}
              className="btn-ghost text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !fetchError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Search className="w-8 h-8" />
            <p className="text-sm">No rooms match your filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-ghost text-xs">Clear filters</button>
            )}
          </div>
        )}

        {/* Room grid — grouped by type when no filters, flat otherwise */}
        {!isLoading && !fetchError && filtered.length > 0 && (
          roundType === '' && difficulty === '' && search === ''
            ? Array.from(grouped.entries()).map(([groupLabel, groupRooms]) => (
                <div key={groupLabel} className="mb-8">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    {groupLabel}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupRooms.map((room) => (
                      <RoomCard key={room.id} room={room} onSelect={handleSelect} />
                    ))}
                  </div>
                </div>
              ))
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((room) => (
                  <RoomCard key={room.id} room={room} onSelect={handleSelect} />
                ))}
              </div>
            )
        )}
      </div>

      {/* Confirmation modal */}
      {selected && (
        <ConfirmModal
          room={selected}
          onConfirm={handleConfirm}
          onCancel={() => { setSelected(null); setStartError(null); }}
          isStarting={isStarting}
          error={startError}
        />
      )}
    </>
  );
};

export default Rooms;
