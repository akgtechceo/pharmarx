import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, UserRole } from '@pharmarx/shared-types';
import { LoginFormData } from '../components/LoginForm';

export interface LoginResult {
  uid: string;
  user: any; // Firebase user object
  userProfile: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export class AuthenticationService {
  private static instance: AuthenticationService;
  
  private constructor() {}
  
  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Log in user with email/phone and password
   */
  async login(formData: LoginFormData): Promise<LoginResult> {
    try {
      // Step 1: Authenticate with Firebase
      const { uid, user } = await this.authenticateWithFirebase(formData);

      // Step 2: Get user profile from backend
      const userProfile = await this.getUserProfile(user);

      return { uid, user, userProfile };
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthenticationError(error);
    }
  }

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  /**
   * Get current user's authentication state
   */
  async getCurrentAuthState(): Promise<AuthState> {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        isAuthenticated: false,
        user: null,
        token: null
      };
    }

    try {
      const token = await currentUser.getIdToken();
      const userProfile = await this.getUserProfile(currentUser);
      
      return {
        isAuthenticated: true,
        user: userProfile,
        token
      };
    } catch (error) {
      console.error('Failed to get current auth state:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null
      };
    }
  }

  /**
   * Refresh the current user's token
   */
  async refreshToken(): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    try {
      return await currentUser.getIdToken(true); // Force refresh
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    try {
      const authState = await this.getCurrentAuthState();
      return authState.user?.role === role;
    } catch (error) {
      console.error('Role check failed:', error);
      return false;
    }
  }

  /**
   * Get user's role for routing decisions
   */
  async getUserRole(): Promise<UserRole | null> {
    try {
      const authState = await this.getCurrentAuthState();
      return authState.user?.role || null;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  /**
   * Authenticate with Firebase using email/phone and password
   */
  private async authenticateWithFirebase(formData: LoginFormData): Promise<{ uid: string; user: any }> {
    // For phone number login, we need to use the same email pattern as registration
    // This is a limitation of the current Firebase setup
    const email = formData.contactType === 'email' 
      ? formData.email! 
      : `${formData.phoneNumber?.replace(/\D/g, '')}@temp.pharmarx.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, formData.password);
      return {
        uid: userCredential.user.uid,
        user: userCredential.user
      };
    } catch (error: any) {
      // Re-throw with more user-friendly messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with these credentials.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Get user profile from backend
   */
  private async getUserProfile(firebaseUser: any): Promise<User> {
    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken();

      // Call backend API to get user profile
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to get user profile';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Failed to get user profile');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      // Re-throw the specific error message instead of generic one
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load user profile. Please try logging in again.');
    }
  }

  /**
   * Handle authentication errors and provide user-friendly messages
   */
  private handleAuthenticationError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return new Error('Network error. Please check your connection and try again.');
    }

    // Handle unknown errors
    return new Error('Authentication failed. Please try again.');
  }
}

// Export singleton instance
export const authenticationService = AuthenticationService.getInstance();
export default authenticationService; 