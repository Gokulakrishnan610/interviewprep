import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, LogOut, ChevronDown, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/rooms',     label: 'Rooms',     icon: LayoutGrid },
  { path: '/sessions',  label: 'Sessions',  icon: Calendar },
];

const Navigation: React.FC = () => {
  const location = useLocation();
  const { state, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = [state.user?.first_name?.[0], state.user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 z-50 border-b border-[#1e2d45] bg-[#0a0f1e]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:bg-indigo-500 transition">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">InterviewPrep</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2235]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-[#1a2235] transition"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
            <span className="hidden md:block text-sm font-medium text-slate-300">
              {state.user?.first_name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-[#1e2d45] rounded-xl shadow-xl overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#1e2d45]">
                <p className="text-sm font-semibold text-slate-100">
                  {state.user?.first_name} {state.user?.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{state.user?.email}</p>
                {!state.user?.is_email_verified && (
                  <span className="mt-1 inline-block text-xs text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5">
                    Email unverified
                  </span>
                )}
              </div>

              {/* Mobile nav items */}
              <div className="md:hidden py-1">
                {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-[#1a2235] transition"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
                <div className="border-t border-[#1e2d45] my-1" />
              </div>

              {/* Logout */}
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-[#1a2235] hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
