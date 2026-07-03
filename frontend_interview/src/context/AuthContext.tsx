import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { tokenStorage, SESSION_EXPIRED_EVENT, getErrorMessage } from '../api/client';
import type { User } from '../types';

// ── State ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  /** True only during the initial app-load bootstrap */
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  /** Set when login fails specifically because email is not yet verified */
  unverifiedEmail: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_UNVERIFIED'; payload: { message: string; email: string } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  isLoading: true,   // starts true; bootstrap sets it false
  isAuthenticated: false,
  error: null,
  unverifiedEmail: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null, unverifiedEmail: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        unverifiedEmail: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
        unverifiedEmail: null,
      };
    case 'AUTH_UNVERIFIED':
      return {
        ...state,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload.message,
        unverifiedEmail: action.payload.email,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        unverifiedEmail: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null, unverifiedEmail: null };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

// ── Context type ──────────────────────────────────────────────────────────────

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }) => Promise<{ success: boolean; requiresVerification: boolean }>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  /** Called by VerifyEmail page after tokens arrive from the backend */
  completeVerification: (accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // ── Logout (shared by explicit logout and 401 expiry) ─────────────────────
  const logout = useCallback(() => {
    tokenStorage.clear();
    dispatch({ type: 'AUTH_LOGOUT' });
    navigate('/login', { replace: true });
  }, [navigate]);

  // ── Listen for session-expired events from the axios interceptor ──────────
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [logout]);

  // ── Bootstrap: restore session on app load ────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      const token = tokenStorage.getAccess();
      if (!token) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }
      try {
        const user = await authApi.getMe();
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch (err: unknown) {
        // The axios interceptor handles 401 → fires SESSION_EXPIRED_EVENT → calls logout().
        // If we land here it's a non-auth error (e.g. network timeout, 5xx).
        // In that case keep the tokens — the user is still logged in; the server
        // is temporarily unreachable. Just mark loading as done.
        const status = (err as any)?.response?.status;
        if (status === 401 || status === 403) {
          // Auth failure not caught by interceptor (shouldn't happen, but be safe)
          tokenStorage.clear();
          dispatch({ type: 'AUTH_LOGOUT' });
        } else {
          // Transient error — keep tokens, allow the app to load
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    };
    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const tokens = await authApi.login({ email, password });
      tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);

      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      return true;
    } catch (err: unknown) {
      const detail = getErrorMessage(err, 'Login failed');

      // Detect the backend's specific "email not verified" message
      const isUnverified =
        detail.toLowerCase().includes('verify your email') ||
        detail.toLowerCase().includes('email address before logging in');

      if (isUnverified) {
        dispatch({ type: 'AUTH_UNVERIFIED', payload: { message: detail, email } });
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: detail });
      }
      tokenStorage.clear();
      return false;
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (payload: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }): Promise<{ success: boolean; requiresVerification: boolean }> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authApi.register(payload);

      if (result.email_sent) {
        // Email verification required — do NOT log the user in yet.
        // Tokens are issued by the backend but we deliberately discard them
        // so the app stays in the unauthenticated state until the email link
        // is clicked and verification completes.
        dispatch({ type: 'AUTH_LOGOUT' });
        return { success: true, requiresVerification: true };
      }

      // If for some reason email_sent is false (SMTP disabled in dev), log in directly
      tokenStorage.setTokens(result.access_token, result.refresh_token);
      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      return { success: true, requiresVerification: false };
    } catch (err: unknown) {
      dispatch({ type: 'AUTH_FAILURE', payload: getErrorMessage(err, 'Registration failed') });
      tokenStorage.clear();
      return { success: false, requiresVerification: false };
    }
  };

  // ── completeVerification: called by VerifyEmail page on success ───────────
  const completeVerification = async (accessToken: string, refreshToken: string) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    try {
      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch {
      // getMe shouldn't fail with fresh tokens, but handle gracefully
      tokenStorage.clear();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // ── Refresh user profile in-place ─────────────────────────────────────────
  const refreshUser = async () => {
    try {
      const user = await authApi.getMe();
      dispatch({ type: 'UPDATE_USER', payload: user });
    } catch {
      // Silently ignore transient failures; interceptor handles expiry
    }
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{ state, login, register, logout, clearError, refreshUser, completeVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
