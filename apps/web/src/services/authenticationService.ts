import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { LoginFormData } from '../components/LoginForm';
import { User, UserRole } from '@pharmarx/shared-types';

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
      // Force Firebase emulator usage in development if emulator is running
      const emulatorDetected = this.isEmulatorRunning();
      
      if (emulatorDetected || this.isRealFirebaseConfigured()) {
        console.log(emulatorDetected ? 
          '🔐 Using real Firebase authentication with emulators' : 
          '🔐 Using real Firebase authentication');
        return await this.realFirebaseLogin(formData);
      } else {
        console.log('🎭 Using mock authentication for development');
        return await this.mockLogin(formData);
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Check if this is a Firebase emulator 400 error (Bad Request)
      const is400Error = error instanceof Error && 
                        (error.message.includes('400') || 
                         error.message.includes('Bad Request') ||
                         error.message.includes('network-request-failed'));
      
      // Fallback to mock login if Firebase fails, especially for emulator errors
      if (import.meta.env.DEV) {
        if (is400Error) {
          console.log('🔧 Firebase emulator error detected, falling back to mock login...');
        } else {
          console.log('Falling back to mock login...');
        }
        return await this.mockLogin(formData);
      }
      
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
      // Try to get token - this might fail with 400 error in emulator
      const token = await currentUser.getIdToken();
      const userProfile = await this.getUserProfile(currentUser);
      
      return {
        isAuthenticated: true,
        user: userProfile,
        token
      };
    } catch (error) {
      console.error('Failed to get current auth state:', error);
      
      // Check if this is a Firebase emulator error (400 Bad Request or network-request-failed)
      const isEmulatorError = error instanceof Error && 
                             (error.message.includes('400') || 
                              error.message.includes('Bad Request') ||
                              error.message.includes('network-request-failed') ||
                              error.message.includes('auth/network-request-failed'));
      
      if (isEmulatorError) {
        console.log('🧹 Clearing stale authentication state due to emulator error');
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.warn('Failed to sign out during error recovery:', signOutError);
        }
      }
      
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
   * Get user profile from Firestore or backend
   */
  private async getUserProfile(firebaseUser: any): Promise<User> {
    try {
      // First, try to get user profile from Firestore
      const userProfile = await this.getUserProfileFromFirestore(firebaseUser.uid);
      if (userProfile) {
        console.log('✅ Retrieved user profile from Firestore:', {
          uid: userProfile.uid,
          role: userProfile.role,
          displayName: userProfile.displayName
        });
        return userProfile;
      }
    } catch (firestoreError) {
      console.warn('Failed to get user profile from Firestore:', firestoreError);
    }

    try {
      // Fallback: Get user profile from backend API
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        // Check if this is an HTML response (backend not running)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Backend API not available (returned HTML instead of JSON)');
        }
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to get user profile';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Failed to get user profile');
      }

      console.log('✅ Retrieved user profile from backend API');
      return result.data;
    } catch (error) {
      console.error('Failed to get user profile from backend:', error);
      // Re-throw the specific error message instead of generic one
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load user profile. Please try logging in again.');
    }
  }

  /**
   * Get user profile from Firestore
   */
  private async getUserProfileFromFirestore(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        console.log('🔍 User profile not found in Firestore for uid:', uid);
        return null;
      }

      const userData = userDoc.data();
      
      // Convert Firestore data to User interface
      const userProfile: User = {
        uid: userData.uid,
        role: userData.role as UserRole,
        displayName: userData.displayName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        createdAt: userData.createdAt?.toDate() || new Date()
      };

      return userProfile;
    } catch (error) {
      console.error('Error retrieving user profile from Firestore:', error);
      throw error;
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

  /**
   * Check if real Firebase is properly configured
   */
  private isRealFirebaseConfigured(): boolean {
    try {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      
      return !!(apiKey && 
                projectId && 
                apiKey !== 'demo-api-key' && 
                apiKey !== 'your_api_key_here' &&
                projectId !== 'your_project_id');
    } catch {
      return false;
    }
  }

  /**
   * Check if Firebase emulators are running
   */
  private isEmulatorRunning(): boolean {
    try {
      // Check if we're in development and emulators are configured
      const isDevMode = import.meta.env.DEV;
      const hasAuthApp = auth && !!auth.app;
      const currentApiKey = auth?.app?.options?.apiKey;
      const isUsingDemoKey = currentApiKey === 'demo-api-key';
      
      // Also check if we're on localhost (strong indicator of emulator usage)
      const isLocalhost = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1');
      
      console.log('🔍 Emulator detection:', {
        isDevMode,
        hasAuthApp,
        currentApiKey,
        isUsingDemoKey,
        isLocalhost,
        emulatorRunning: isDevMode && hasAuthApp && (isUsingDemoKey || isLocalhost)
      });
      
      // Return true if we're in dev mode, have auth app, and either using demo key OR on localhost
      return isDevMode && hasAuthApp && (isUsingDemoKey || isLocalhost);
    } catch (error) {
      console.warn('Emulator detection failed:', error);
      return false;
    }
  }

  /**
   * Real Firebase login
   */
  private async realFirebaseLogin(formData: LoginFormData): Promise<LoginResult> {
    // Step 1: Authenticate with Firebase
    const { uid, user } = await this.authenticateWithFirebase(formData);

    // Step 2: Get user profile from backend (or create profile from Firebase data)
    let userProfile: User;
    try {
      userProfile = await this.getUserProfile(user);
    } catch (backendError) {
      console.warn('Backend user profile fetch failed, creating profile from Firebase data:', backendError);
      userProfile = await this.createUserProfileFromFirebase(user, formData);
    }

    console.log('✅ Real Firebase login successful:', {
      uid: user.uid,
      email: user.email,
      role: userProfile.role
    });

    return { uid, user, userProfile };
  }

  /**
   * Create user profile from Firebase user data
   */
  private async createUserProfileFromFirebase(firebaseUser: any, formData: LoginFormData): Promise<User> {
    // First, try to get the user profile from Firestore
    try {
      const firestoreProfile = await this.getUserProfileFromFirestore(firebaseUser.uid);
      if (firestoreProfile) {
        console.log('🔍 Found user profile in Firestore with role:', firestoreProfile.role);
        return firestoreProfile;
      }
    } catch (error) {
      console.warn('Failed to retrieve profile from Firestore:', error);
    }

    // Fallback: Try to determine role from multiple sources
    let detectedRole = UserRole.Patient; // Default fallback
    
    const email = formData.contactType === 'email' ? formData.email : undefined;
    const phone = formData.contactType === 'phone' ? formData.phoneNumber : undefined;
    
    // Method 1: Check if we have stored user data in localStorage (for mock development)
    try {
      const storedUsers = localStorage.getItem('pharmarx_mock_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        const existingUser = users.find((user: any) => 
          (email && user.email === email) || (phone && user.phoneNumber === phone)
        );
        if (existingUser && existingUser.role) {
          detectedRole = existingUser.role;
          console.log('🔍 Found existing user role from localStorage:', detectedRole, 'for', email || phone);
          return this.createUserObject(firebaseUser, formData, detectedRole);
        } else {
          console.log('🔍 No existing user found in localStorage for:', email || phone);
        }
      } else {
        console.log('🔍 No stored users found in localStorage');
      }
    } catch (error) {
      console.warn('Failed to check stored user data:', error);
    }
    
    // Method 2: Try to detect role from email patterns
    if (email) {
      const emailLower = email.toLowerCase();
      if (emailLower.includes('doctor') || emailLower.includes('dr.')) {
        detectedRole = UserRole.Doctor;
        console.log('🔍 Detected Doctor role from email pattern');
      } else if (emailLower.includes('pharmacist') || emailLower.includes('pharmacy')) {
        detectedRole = UserRole.Pharmacist;
        console.log('🔍 Detected Pharmacist role from email pattern');
      } else if (emailLower.includes('caregiver') || emailLower.includes('care')) {
        detectedRole = UserRole.Caregiver;
        console.log('🔍 Detected Caregiver role from email pattern');
      } else {
        console.log('🔍 No role pattern detected in email, using default Patient role');
      }
    }

    // Method 3: Check Firebase user metadata or custom claims
    if (detectedRole === UserRole.Patient && firebaseUser) {
      // Try to get role from Firebase user metadata
      const displayName = firebaseUser.displayName;
      if (displayName) {
        const nameLower = displayName.toLowerCase();
        if (nameLower.includes('doctor') || nameLower.includes('dr.')) {
          detectedRole = UserRole.Doctor;
          console.log('🔍 Detected Doctor role from Firebase display name');
        } else if (nameLower.includes('pharmacist') || nameLower.includes('pharmacy')) {
          detectedRole = UserRole.Pharmacist;
          console.log('🔍 Detected Pharmacist role from Firebase display name');
        } else if (nameLower.includes('caregiver') || nameLower.includes('care')) {
          detectedRole = UserRole.Caregiver;
          console.log('🔍 Detected Caregiver role from Firebase display name');
        }
      }
    }

    // Method 4: Check Firebase user email (if different from form data)
    if (detectedRole === UserRole.Patient && firebaseUser.email) {
      const firebaseEmailLower = firebaseUser.email.toLowerCase();
      if (firebaseEmailLower.includes('doctor') || firebaseEmailLower.includes('dr.')) {
        detectedRole = UserRole.Doctor;
        console.log('🔍 Detected Doctor role from Firebase email');
      } else if (firebaseEmailLower.includes('pharmacist') || firebaseEmailLower.includes('pharmacy')) {
        detectedRole = UserRole.Pharmacist;
        console.log('🔍 Detected Pharmacist role from Firebase email');
      } else if (firebaseEmailLower.includes('caregiver') || firebaseEmailLower.includes('care')) {
        detectedRole = UserRole.Caregiver;
        console.log('🔍 Detected Caregiver role from Firebase email');
      }
    }

    console.log('🎯 Final role detection result:', detectedRole, 'for user:', email || phone);
    return this.createUserObject(firebaseUser, formData, detectedRole);
  }

  /**
   * Helper method to create user object with consistent structure
   */
  private createUserObject(firebaseUser: any, formData: LoginFormData, role: UserRole): User {
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || formData.email?.split('@')[0] || 'User',
      email: firebaseUser.email || (formData.contactType === 'email' ? formData.email : undefined),
      phoneNumber: firebaseUser.phoneNumber || (formData.contactType === 'phone' ? formData.phoneNumber : undefined),
      role: role,
      createdAt: firebaseUser.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date()
    };
  }

  /**
   * Mock login for development when Firebase is not available
   */
  private async mockLogin(formData: LoginFormData): Promise<LoginResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock UID
    const mockUid = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create mock user object
    const mockUser = {
      uid: mockUid,
      email: formData.contactType === 'email' ? formData.email : undefined,
      phoneNumber: formData.contactType === 'phone' ? formData.phoneNumber : undefined,
      getIdToken: async () => `mock_token_${mockUid}`,
      emailVerified: true
    };

    // Create mock user profile with role detection
    const userProfile = this.createMockUserProfile(mockUser, formData);

    console.log('✅ Mock login successful:', {
      uid: mockUid,
      displayName: userProfile.displayName,
      role: userProfile.role,
      contactType: formData.contactType
    });

    return { uid: mockUid, user: mockUser, userProfile };
  }

  /**
   * Create mock user profile with role detection
   */
  private createMockUserProfile(firebaseUser: any, formData: LoginFormData): User {
    // Try to determine role from email/phone patterns or stored data
    let detectedRole = UserRole.Patient; // Default fallback
    
    const email = formData.contactType === 'email' ? formData.email : undefined;
    const phone = formData.contactType === 'phone' ? formData.phoneNumber : undefined;
    
    // Check if we have stored user data in localStorage (for mock development)
    try {
      const storedUsers = localStorage.getItem('pharmarx_mock_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        const existingUser = users.find((user: any) => 
          (email && user.email === email) || (phone && user.phoneNumber === phone)
        );
        if (existingUser && existingUser.role) {
          detectedRole = existingUser.role;
          console.log('🔍 Found existing user role:', detectedRole, 'for', email || phone);
        } else {
          console.log('🔍 No existing user found for:', email || phone);
        }
      } else {
        console.log('🔍 No stored users found in localStorage');
      }
    } catch (error) {
      console.warn('Failed to check stored user data:', error);
    }
    
    // Fallback: Try to detect role from email patterns
    if (detectedRole === UserRole.Patient && email) {
      const emailLower = email.toLowerCase();
      if (emailLower.includes('doctor') || emailLower.includes('dr.')) {
        detectedRole = UserRole.Doctor;
        console.log('🔍 Detected Doctor role from email pattern');
      } else if (emailLower.includes('pharmacist') || emailLower.includes('pharmacy')) {
        detectedRole = UserRole.Pharmacist;
        console.log('🔍 Detected Pharmacist role from email pattern');
      } else if (emailLower.includes('caregiver') || emailLower.includes('care')) {
        detectedRole = UserRole.Caregiver;
        console.log('🔍 Detected Caregiver role from email pattern');
      }
    }

    return {
      uid: firebaseUser.uid,
      displayName: formData.email?.split('@')[0] || 'Mock User',
      email: formData.contactType === 'email' ? formData.email : undefined,
      phoneNumber: formData.contactType === 'phone' ? formData.phoneNumber : undefined,
      role: detectedRole,
      createdAt: new Date()
    };
  }

  /**
   * Utility method to clear stored mock user data (for development/debugging)
   */
  public clearMockUserData(): void {
    try {
      localStorage.removeItem('pharmarx_mock_users');
      console.log('🧹 Cleared mock user data from localStorage');
    } catch (error) {
      console.warn('Failed to clear mock user data:', error);
    }
  }

  /**
   * Create a test user in Firebase Auth emulator for testing (development only)
   */
  public async createTestUser(email: string = 'test@pharmarx.com', password: string = 'test123'): Promise<void> {
    if (!import.meta.env.DEV) {
      throw new Error('Test user creation is only available in development mode');
    }

    try {
      console.log('🧪 Creating test user in Firebase Auth emulator...');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore (avoid undefined values)
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: 'Test Patient',
        role: 'patient',
        phoneNumber: null, // Use null instead of undefined
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      console.log('✅ Test user created successfully:', {
        uid: user.uid,
        email: user.email,
        message: `You can now login with ${email} / ${password}`
      });

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Test user already exists:', email);
      } else {
        console.error('Failed to create test user:', error);
        throw error;
      }
    }
  }

  /**
   * Utility method to get stored mock user data (for development/debugging)
   */
  public getMockUserData(): any[] {
    try {
      const storedUsers = localStorage.getItem('pharmarx_mock_users');
      return storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
      console.warn('Failed to get mock user data:', error);
      return [];
    }
  }

  /**
   * Utility method to manually set user role for testing (for development/debugging)
   */
  public setUserRoleForTesting(email: string, role: UserRole): void {
    try {
      const storedUsers = localStorage.getItem('pharmarx_mock_users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      
      const existingUserIndex = users.findIndex((user: any) => user.email === email);
      
      if (existingUserIndex >= 0) {
        users[existingUserIndex].role = role;
        console.log('🔧 Updated existing user role:', email, '->', role);
      } else {
        users.push({
          uid: `test_${Date.now()}`,
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
        console.log('🔧 Added new test user:', email, '->', role);
      }
      
      localStorage.setItem('pharmarx_mock_users', JSON.stringify(users));
      console.log('💾 Saved test user data to localStorage');
    } catch (error) {
      console.warn('Failed to set test user role:', error);
    }
  }
}

// Export singleton instance
export const authenticationService = AuthenticationService.getInstance();
export default authenticationService;

// Expose test utilities in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).createTestUser = () => authenticationService.createTestUser();
  (window as any).clearMockData = () => authenticationService.clearMockUserData();
  console.log('🛠️ Development utilities available:');
  console.log('  - window.createTestUser() - Creates test@pharmarx.com / test123');
  console.log('  - window.clearMockData() - Clears mock user data');
} 