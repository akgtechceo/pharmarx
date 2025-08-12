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
  updateAuthState: (user: User, token: string) => void;
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
          console.log('🔄 Refreshing authentication token...');
          const newToken = await authenticationService.refreshToken();
          set({ token: newToken });
          console.log('✅ Token refreshed successfully');
        } catch (error) {
          console.error('Token refresh failed:', error);
          
          // Check if this is a Firebase auth error that requires re-authentication
          const isCriticalError = error instanceof Error && (
            error.message.includes('user-not-found') ||
            error.message.includes('user-disabled') ||
            error.message.includes('invalid-credential') ||
            error.message.includes('auth/invalid-credential') ||
            error.message.includes('No authenticated user found') ||
            error.message.includes('auth/user-token-expired') ||
            error.message.includes('auth/requires-recent-login')
          );
          
          if (isCriticalError) {
            console.log('🔐 Critical auth error, clearing auth state');
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              error: 'Session expired. Please log in again.'
            });
          } else {
            console.log('🔐 Non-critical token refresh error, keeping auth state');
            // Keep the auth state but set token to null - it will be retried
            set({ token: null });
          }
          
          // Re-throw the error so calling code can handle it
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      initializeAuth: async () => {
        const currentState = get();
        // Don't re-initialize if already authenticated with token
        if (currentState.isAuthenticated && currentState.token) {
          console.log('✅ Auth already initialized with token');
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const authState = await authenticationService.getCurrentAuthState();
          
          if (authState.isAuthenticated && authState.user && authState.token) {
            // Full authentication state available
            set({
              isAuthenticated: true,
              user: authState.user,
              token: authState.token,
              isLoading: false,
              error: null
            });
            console.log('✅ Auth initialized with token');
          } else if (authState.isAuthenticated && authState.user && !authState.token) {
            // User is authenticated but token is missing - try to refresh
            console.log('🔄 User authenticated but token missing, attempting refresh...');
            try {
              const newToken = await authenticationService.refreshToken();
              set({
                isAuthenticated: true,
                user: authState.user,
                token: newToken,
                isLoading: false,
                error: null
              });
              console.log('✅ Token refreshed during initialization');
            } catch (refreshError) {
              console.error('❌ Token refresh failed during initialization:', refreshError);
              // Keep the user authenticated but without token - it will be refreshed when needed
              set({
                isAuthenticated: true,
                user: authState.user,
                token: null,
                isLoading: false,
                error: null
              });
            }
          } else {
            // No authentication state
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null
            });
            console.log('ℹ️ No authentication state found');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          
          // If we have a user in the store but Firebase auth failed,
          // don't clear the auth state - just set token to null
          const currentState = get();
          if (currentState.isAuthenticated && currentState.user) {
            console.log('🔐 Preserving auth state despite Firebase error');
            set({
              isAuthenticated: true,
              user: currentState.user,
              token: null, // Token will be refreshed when needed
              isLoading: false,
              error: null
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null // Don't show error for initialization failure
            });
          }
        }
      },

      hasRole: (role: UserRole) => {
        const state = get();
        return state.isAuthenticated && state.user?.role === role;
      },

      updateAuthState: (user: User, token: string) => {
        console.log('🔐 Updating auth state with token:', !!token);
        set({ 
          isAuthenticated: true,
          user, 
          token,
          error: null 
        });
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
          // Clear token on hydration - it will be refreshed when needed
          state.token = null;
          // Don't automatically call initializeAuth here - let the app handle it
          // This prevents issues with Firebase emulator errors during app load
        }
      }
    }
  )
); 