import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@pharmarx/shared-types';
import { authenticationService } from '../services/authenticationService';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, phoneNumber: string, password: string, contactType: 'email' | 'phone') => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
}

export interface AuthStore extends AuthState, AuthActions {}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, phoneNumber: string, password: string, contactType: 'email' | 'phone') => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await authenticationService.login({
            contactType,
            email: contactType === 'email' ? email : undefined,
            phoneNumber: contactType === 'phone' ? phoneNumber : undefined,
            password
          });

          const token = await result.user.getIdToken();

          set({
            isAuthenticated: true,
            user: result.userProfile,
            token,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Login failed:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await authenticationService.logout();
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Logout failed:', error);
          // Even if logout fails, clear local state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Logout failed'
          });
        }
      },

      refreshToken: async () => {
        try {
          const newToken = await authenticationService.refreshToken();
          set({ token: newToken });
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If token refresh fails, user needs to log in again
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            error: 'Session expired. Please log in again.'
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        
        try {
          const authState = await authenticationService.getCurrentAuthState();
          set({
            isAuthenticated: authState.isAuthenticated,
            user: authState.user,
            token: authState.token,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Auth initialization failed:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null // Don't show error for initialization failure
          });
        }
      },

      hasRole: (role: UserRole) => {
        const state = get();
        return state.isAuthenticated && state.user?.role === role;
      }
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // Don't persist token for security - it will be refreshed on app load
      }),
      // Custom storage to handle hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clear token on hydration - it will be refreshed
          state.token = null;
          // Initialize auth state from Firebase
          state.initializeAuth();
        }
      }
    }
  )
); 