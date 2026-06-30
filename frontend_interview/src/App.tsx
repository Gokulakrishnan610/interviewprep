import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import InterviewSessions from './pages/InterviewSessions';
import VoiceInterview from './pages/VoiceInterview';
import SessionReport from './pages/SessionReport';
import './App.css';

// ── Full-screen loading spinner ───────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  </div>
);

// ── Protected route guard ─────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();

  // Wait for bootstrap to complete before making any routing decision
  if (state.isLoading) return <LoadingScreen />;

  return state.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ── Public route: redirect to dashboard if already authenticated ──────────────
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();

  // Hold during bootstrap — prevents a flash of the login page
  if (state.isLoading) return <LoadingScreen />;

  return state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

// ── App shell ─────────────────────────────────────────────────────────────────
const AppShell: React.FC = () => {
  const { state } = useAuth();

  return (
    <div className="App">
      {state.isAuthenticated && <Navigation />}
      <main className="main-content">
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/" element={
            <PublicRoute><Landing /></PublicRoute>
          } />
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          {/* Verify-email is intentionally always accessible:
              - unauthenticated users land here from the email link
              - authenticated users who re-click the link should still see success */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ── Protected ───────────────────────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/rooms" element={
            <ProtectedRoute><Rooms /></ProtectedRoute>
          } />
          <Route path="/sessions" element={
            <ProtectedRoute><InterviewSessions /></ProtectedRoute>
          } />
          <Route path="/sessions/:sessionId" element={
            <ProtectedRoute><VoiceInterview /></ProtectedRoute>
          } />
          <Route path="/sessions/:sessionId/report" element={
            <ProtectedRoute><SessionReport /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
// AuthProvider must sit inside <Router> because it uses useNavigate.
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
