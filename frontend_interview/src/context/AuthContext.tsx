import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiService, ApiResponse } from '../services/api';
import { User } from '../types';

// Types
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Context
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: { email: string; first_name: string; last_name: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token) {
        try {
          const response = await apiService.getCurrentUser();
          
          if (response.success && response.data) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user: response.data, token },
            });
          } else {
            // Try to refresh token
            if (refreshToken) {
              try {
                const refreshResponse = await apiService.refreshToken(refreshToken);
                if (refreshResponse.success && refreshResponse.data) {
                  const { access: newToken, refresh: newRefreshToken } = refreshResponse.data;
                  localStorage.setItem('token', newToken);
                  localStorage.setItem('refreshToken', newRefreshToken || refreshToken);
                  
                  // Try getCurrentUser again with new token
                  const userResponse = await apiService.getCurrentUser();
                  if (userResponse.success && userResponse.data) {
                    dispatch({
                      type: 'AUTH_SUCCESS',
                      payload: { user: userResponse.data, token: newToken },
                    });
                    return;
                  }
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
              }
            }
            
            // Token refresh failed or no refresh token
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
          }
        } catch (error) {
          // Try to refresh token on network error too
          if (refreshToken) {
            try {
              const refreshResponse = await apiService.refreshToken(refreshToken);
              if (refreshResponse.success && refreshResponse.data) {
                const { access: newToken, refresh: newRefreshToken } = refreshResponse.data;
                localStorage.setItem('token', newToken);
                localStorage.setItem('refreshToken', newRefreshToken || refreshToken);
                
                // Try getCurrentUser again with new token
                const userResponse = await apiService.getCurrentUser();
                if (userResponse.success && userResponse.data) {
                  dispatch({
                    type: 'AUTH_SUCCESS',
                    payload: { user: userResponse.data, token: newToken },
                  });
                  return;
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication failed' });
        }
      } else {
        // No token found - this is normal for new users, not an error
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { access_token: token, refresh_token, user } = response.data;
        
        // Store token, refresh token and user in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token },
        });
        
        return true;
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'Login failed',
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Login failed',
      });
      return false;
    }
  };

  // Register function
  const register = async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        const { access_token: token, refresh_token, user } = response.data;
        
        // Store token, refresh token and user in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token },
        });
        
        return true;
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'Registration failed',
        });
        return false;
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Registration failed',
      });
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  // Update user function
  const updateUser = async (userData: Partial<User>): Promise<boolean> => {
    try {
      const response = await apiService.updateUserProfile(userData);
      
      if (response.success && response.data) {
        dispatch({
          type: 'UPDATE_USER',
          payload: response.data,
        });
        
        // Update localStorage
        const updatedUser = { ...state.user, ...response.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return true;
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'Update failed',
        });
        return false;
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Update failed',
      });
      return false;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types
export type { User, AuthState }; 