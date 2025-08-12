import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@pharmarx/shared-types';
import { authenticationService } from '../services/authenticationService';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribe?: () => void; // Add unsubscribe function to state
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
  cleanup: () => void; // Add cleanup action
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
          // Clean up Firebase auth listener
          const currentState = get();
          if (currentState.unsubscribe) {
            currentState.unsubscribe();
          }
          
          await authenticationService.logout();
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
            unsubscribe: undefined
          });
        } catch (error) {
          console.error('Logout failed:', error);
          // Even if logout fails, clear local state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Logout failed',
            unsubscribe: undefined
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
          // Set up Firebase auth state listener
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('🔍 Firebase auth state changed:', firebaseUser ? firebaseUser.uid : 'none');
            
            if (firebaseUser) {
              // Firebase has a user, try to get their token
              try {
                const firebaseToken = await firebaseUser.getIdToken();
                console.log('✅ Got Firebase token:', !!firebaseToken);
                
                // Get user profile from authentication service
                const authState = await authenticationService.getCurrentAuthState();
                
                if (authState.user) {
                  // Full authentication state available
                  set({
                    isAuthenticated: true,
                    user: authState.user,
                    token: firebaseToken,
                    isLoading: false,
                    error: null,
                    unsubscribe // Store the unsubscribe function
                  });
                  console.log('✅ Auth initialized with Firebase user and token');
                } else {
                  // User in Firebase but no profile - this shouldn't happen
                  console.warn('⚠️ Firebase user exists but no profile found');
                  set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    isLoading: false,
                    error: 'User profile not found',
                    unsubscribe
                  });
                }
              } catch (tokenError) {
                console.error('❌ Failed to get Firebase token:', tokenError);
                // Clear auth state if we can't get a token
                set({
                  isAuthenticated: false,
                  user: null,
                  token: null,
                  isLoading: false,
                  error: 'Failed to get authentication token',
                  unsubscribe
                });
              }
            } else {
              // No Firebase user, clear auth state
              set({
                isAuthenticated: false,
                user: null,
                token: null,
                isLoading: false,
                error: null,
                unsubscribe
              });
              console.log('ℹ️ Firebase user signed out, cleared auth state');
            }
          });
          
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
      },

      cleanup: () => {
        const currentState = get();
        if (currentState.unsubscribe) {
          currentState.unsubscribe();
          set({ unsubscribe: undefined });
        }
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