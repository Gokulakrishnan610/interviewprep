import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import Navigation from './components/Navigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import InterviewSessions from './pages/InterviewSessions';
import VoiceInterview from './pages/VoiceInterview';
import InterviewRoom from './components/InterviewRoom';
import VideoInterview from './pages/VideoInterview';
import PracticeMode from './pages/PracticeMode';
import Profile from './pages/Profile';
import InterviewResults from './pages/InterviewResults';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { state } = useAuth();

  return (
    <Router>
      <div className="App">
        {state.isAuthenticated && <Navigation />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />
            } />
            <Route path="/login" element={
              state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            } />
            <Route path="/register" element={
              state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
            } />
            <Route path="/verify-email" element={
              state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <VerifyEmail />
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/sessions" element={
              <ProtectedRoute>
                <InterviewSessions />
              </ProtectedRoute>
            } />
            <Route path="/video-interview/:id" element={
              <ProtectedRoute>
                <VideoInterview />
              </ProtectedRoute>
            } />
            <Route path="/interview/:interviewId" element={
              <ProtectedRoute>
                <VideoInterview />
              </ProtectedRoute>
            } />
            <Route path="/practice" element={
              <ProtectedRoute>
                <PracticeMode />
              </ProtectedRoute>
            } />
            <Route path="/practice-session/:agentId" element={
              <ProtectedRoute>
                <VoiceInterview />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/interview-results" element={
              <ProtectedRoute>
                <InterviewResults />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <AppContent />
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App; 