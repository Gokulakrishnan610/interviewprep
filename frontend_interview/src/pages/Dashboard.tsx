import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, LayoutGrid, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const user = authState.user;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">
          Welcome back, <span className="text-indigo-400">{user?.first_name || 'there'}</span>
        </h1>
        <p className="text-slate-400 mt-1">Ready to ace your next interview?</p>
      </div>

      {/* Email verification banner */}
      {user && !user.is_email_verified && (
        <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
          <span className="shrink-0">⚠</span>
          <span>Your email address isn't verified yet. Check your inbox for the verification link.</span>
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
          <p className="text-sm text-slate-400">Choose an interview room and start a new session.</p>
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

        <div className="group card opacity-60 cursor-default">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Progress</h3>
          <p className="text-sm text-slate-400">Analytics coming soon.</p>
        </div>
      </div>

      {/* Account info card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Account</h2>
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
