import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Mail, Loader2, Zap } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
  const [searchParams]  = useSearchParams();
  const { completeVerification, state: authState } = useAuth();
  const navigate        = useNavigate();

  const [status, setStatus]           = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [autoRedirect, setAutoRedirect]  = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found. Please use the link from your email.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(async (res) => {
        setStatus('success');

        if (res.access_token && res.refresh_token) {
          // Backend issued fresh tokens — log the user in immediately
          await completeVerification(res.access_token, res.refresh_token);
          setAutoRedirect(true);
          // Give the user a moment to see the success message, then redirect
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
        }
        // If no tokens (e.g. "already verified"), just show the success UI
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.detail || 'This link is invalid or has expired.'
        );
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setResendMessage('');
    try {
      await authApi.resendVerification(resendEmail);
      setResendMessage('Verification email sent — check your inbox.');
    } catch (err: any) {
      // Backend returns a neutral message regardless; surface it
      setResendMessage(
        err.response?.data?.detail || 'If that email is registered, a link has been sent.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8 shadow-xl text-center">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Verifying your email…</h2>
              <p className="text-slate-400 text-sm">Just a moment.</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-5 mx-auto">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Email verified!</h2>
              {autoRedirect ? (
                <>
                  <p className="text-slate-400 text-sm mb-4">
                    You're signed in. Redirecting to your dashboard…
                  </p>
                  <div className="flex justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-sm mb-6">
                    Your account is active.{' '}
                    {authState.isAuthenticated
                      ? 'You can go to your dashboard.'
                      : 'Sign in to start practising.'}
                  </p>
                  {authState.isAuthenticated ? (
                    <Link to="/dashboard" className="btn-primary w-full">
                      Go to Dashboard
                    </Link>
                  ) : (
                    <Link to="/login" className="btn-primary w-full">
                      Sign in
                    </Link>
                  )}
                </>
              )}
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mb-5 mx-auto">
                <XCircle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Verification failed</h2>
              <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>

              {/* Resend form */}
              <div className="border-t border-[#1e2d45] pt-6 text-left">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Get a new verification link
                </p>
                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                  {resendMessage && (
                    <p className="text-xs text-indigo-400">{resendMessage}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isResending}
                    className="btn-primary w-full"
                  >
                    {isResending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Send new link'
                    )}
                  </button>
                </form>
              </div>

              <Link
                to="/login"
                className="btn-ghost w-full mt-3 inline-flex items-center justify-center"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
