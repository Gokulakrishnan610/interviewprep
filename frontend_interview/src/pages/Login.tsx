import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Eye, EyeOff, Mail, Lock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resend-verification sub-flow
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent]   = useState(false);

  const { login, state, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const target = state.unverifiedEmail || email;
    if (!target) return;
    setIsResending(true);
    try {
      await authApi.resendVerification(target);
      setResendSent(true);
    } catch {
      // The backend never reveals whether the email exists; show success anyway
      setResendSent(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (state.error || state.unverifiedEmail) clearError();
    setResendSent(false);
  };

  // ── Unverified-email error state ──────────────────────────────────────────
  const renderUnverifiedBanner = () => (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm">
      <div className="flex items-start gap-2.5 text-amber-300">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium mb-1">Email not verified</p>
          <p className="text-amber-300/80 text-xs">
            Check your inbox for the verification link, or request a new one.
          </p>
        </div>
      </div>

      {resendSent ? (
        <div className="flex items-center gap-2 mt-3 text-green-400 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Verification email sent — check your inbox.
        </div>
      ) : (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={isResending}
          className="mt-3 w-full text-xs font-medium text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 rounded-lg py-2 transition disabled:opacity-50"
        >
          {isResending ? 'Sending…' : 'Resend verification email'}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to continue your interview prep</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Error banners */}
            {state.unverifiedEmail
              ? renderUnverifiedBanner()
              : state.error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                    <span className="flex-1">{state.error}</span>
                    <button
                      type="button"
                      onClick={clearError}
                      className="shrink-0 text-red-400/60 hover:text-red-400 transition"
                      aria-label="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                )
            }

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleFieldChange(setEmail)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={handleFieldChange(setPassword)}
                  className="input pl-10 pr-10"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
