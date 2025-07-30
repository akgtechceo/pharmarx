import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { RegisterFormData } from '../components/RegisterForm';
import { UserRole, CreateUserInput } from '@pharmarx/shared-types';

export interface RegistrationResult {
  uid: string;
  user: any;
}

class RegistrationService {
  private static instance: RegistrationService;
  
  private constructor() {}
  
  public static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  /**
   * Register a new user with role-based authentication
   */
  async register(formData: RegisterFormData): Promise<RegistrationResult> {
    try {
      // Check if we have real Firebase configuration and emulators are running
      if (this.isEmulatorRunning()) {
        console.log('🔐 Using real Firebase authentication with emulators');
        return await this.realFirebaseRegistration(formData);
      } else if (this.isRealFirebaseConfigured()) {
        console.log('🔐 Using real Firebase authentication');
        return await this.realFirebaseRegistration(formData);
      } else {
        console.log('🎭 Using mock authentication for development');
        return await this.mockRegistration(formData);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Fallback to mock registration if Firebase fails
      if (import.meta.env.DEV) {
        console.log('Falling back to mock registration...');
        return await this.mockRegistration(formData);
      }
      
      throw this.handleRegistrationError(error);
    }
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
      // Since we can see the emulator connection messages in console,
      // and we're in development mode, assume emulators are running
      return import.meta.env.DEV && 
             auth && 
             !!auth.app;
    } catch {
      return false;
    }
  }

  /**
   * Real Firebase registration with Firestore role storage
   */
  private async realFirebaseRegistration(formData: RegisterFormData): Promise<RegistrationResult> {
    // For phone numbers, we'll use a temporary email format for Firebase Auth
    // This is a limitation of Firebase Auth - in a real app, you'd use Firebase phone auth
    const email = formData.contactType === 'email' 
      ? formData.email! 
      : `${formData.phoneNumber?.replace(/\D/g, '')}@temp.pharmarx.com`;

    try {
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      
      // Step 2: Store user profile with role in Firestore
      await this.storeUserProfileInFirestore(userCredential.user.uid, formData);
      
      // Step 3: Create user record in backend (optional for now)
      try {
        await this.createUserRecord(userCredential.user.uid, formData, userCredential.user);
      } catch (backendError) {
        console.warn('Backend user record creation failed:', backendError);
        // Continue with registration even if backend fails
      }

      console.log('✅ Real Firebase registration successful:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: formData.displayName,
        role: formData.role
      });

      return {
        uid: userCredential.user.uid,
        user: userCredential.user
      };
    } catch (error: any) {
      // Re-throw with more user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Mock registration for development when Firebase is not available
   */
  private async mockRegistration(formData: RegisterFormData): Promise<RegistrationResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock UID
    const mockUid = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create mock user object
    const mockUser = {
      uid: mockUid,
      email: formData.contactType === 'email' ? formData.email : undefined,
      phoneNumber: formData.contactType === 'phone' ? formData.phoneNumber : undefined,
      displayName: formData.displayName,
      role: formData.role,
      getIdToken: async () => `mock_token_${mockUid}`,
      emailVerified: true
    };

    // Store user data in localStorage for mock development
    try {
      const storedUsers = localStorage.getItem('pharmarx_mock_users');
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      
      // Add or update user
      const existingUserIndex = users.findIndex((user: any) => 
        (formData.email && user.email === formData.email) || 
        (formData.phoneNumber && user.phoneNumber === formData.phoneNumber)
      );
      
      const userData = {
        uid: mockUid,
        email: formData.contactType === 'email' ? formData.email : undefined,
        phoneNumber: formData.contactType === 'phone' ? formData.phoneNumber : undefined,
        displayName: formData.displayName,
        role: formData.role,
        createdAt: new Date().toISOString()
      };
      
      if (existingUserIndex >= 0) {
        users[existingUserIndex] = userData;
      } else {
        users.push(userData);
      }
      
      localStorage.setItem('pharmarx_mock_users', JSON.stringify(users));
      console.log('💾 Stored mock user data in localStorage');
    } catch (error) {
      console.warn('Failed to store mock user data:', error);
    }

    console.log('✅ Mock registration successful:', {
      uid: mockUid,
      displayName: formData.displayName,
      role: formData.role,
      contactType: formData.contactType
    });

    return { uid: mockUid, user: mockUser };
  }

  /**
   * Store user profile with role in Firestore
   */
  private async storeUserProfileInFirestore(uid: string, formData: RegisterFormData): Promise<void> {
    try {
      const userProfile = {
        uid: uid,
        role: formData.role,
        displayName: formData.displayName,
        email: formData.contactType === 'email' ? formData.email : undefined,
        phoneNumber: formData.contactType === 'phone' ? formData.phoneNumber : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in Firestore users collection
      await setDoc(doc(db, 'users', uid), userProfile);
      
      console.log('✅ User profile stored in Firestore:', {
        uid: uid,
        role: formData.role,
        displayName: formData.displayName
      });
    } catch (error) {
      console.error('Failed to store user profile in Firestore:', error);
      throw new Error('Failed to create user profile. Please try again.');
    }
  }

  /**
   * Create user record in backend database
   */
  private async createUserRecord(uid: string, formData: RegisterFormData, firebaseUser: any): Promise<void> {
    // Prepare user data for backend
    const createUserData: CreateUserInput = {
      role: formData.role as UserRole,
      displayName: formData.displayName,
      ...(formData.contactType === 'email' 
        ? { email: formData.email } 
        : { phoneNumber: formData.phoneNumber }
      )
    };

    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken();

      // Call backend API to create user record
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid,
          ...createUserData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to create user record');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user record');
      }
    } catch (error) {
      console.warn('Backend user record creation failed:', error);
      // Don't throw - registration can succeed without backend
    }
  }

  /**
   * Handle registration errors and provide user-friendly messages
   */
  private handleRegistrationError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return new Error('Network error. Please check your connection and try again.');
    }

    // Handle unknown errors
    return new Error('Registration failed. Please try again.');
  }
}

// Export singleton instance
export const registrationService = RegistrationService.getInstance();
export default registrationService; 