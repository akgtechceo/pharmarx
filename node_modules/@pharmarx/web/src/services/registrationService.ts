import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { UserRole, CreateUserInput } from '@pharmarx/shared-types';
import { RegisterFormData } from '../components/RegisterForm';

export interface RegistrationResult {
  uid: string;
  user: any; // Firebase user object
}

export class RegistrationService {
  private static instance: RegistrationService;
  
  private constructor() {}
  
  public static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  /**
   * Register a new user with Firebase Auth and create user record in backend
   */
  async register(formData: RegisterFormData): Promise<RegistrationResult> {
    try {
      // Step 1: Create Firebase Auth user
      const { uid, user } = await this.createFirebaseUser(formData);

      // Step 2: Create user record in backend
      await this.createUserRecord(uid, formData, user);

      return { uid, user };
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleRegistrationError(error);
    }
  }

  /**
   * Create Firebase Auth user account
   */
  private async createFirebaseUser(formData: RegisterFormData): Promise<{ uid: string; user: any }> {
    // For phone number registration, we'll use a placeholder email temporarily
    // This is a limitation of Firebase Auth - in a real app, you'd use Firebase phone auth
    const email = formData.contactType === 'email' 
      ? formData.email! 
      : `${formData.phoneNumber?.replace(/\D/g, '')}@temp.pharmarx.com`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      return {
        uid: userCredential.user.uid,
        user: userCredential.user
      };
    } catch (error: any) {
      // Re-throw with more user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw error;
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