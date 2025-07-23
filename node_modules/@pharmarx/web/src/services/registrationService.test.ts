import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registrationService } from './registrationService';
import { UserRole } from '@pharmarx/shared-types';
import { RegisterFormData } from '../components/RegisterForm';

// Mock Firebase Auth
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockGetIdToken = vi.fn();

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
}));

vi.mock('../config/firebase', () => ({
  auth: {}
}));

// Mock fetch
global.fetch = vi.fn();

describe('RegistrationService', () => {
  const mockFormData: RegisterFormData = {
    role: UserRole.Patient,
    contactType: 'email',
    email: 'patient@example.com',
    displayName: 'Test Patient',
    password: 'password123',
    confirmPassword: 'password123'
  };

  const mockFirebaseUser = {
    uid: 'test-uid-123',
    getIdToken: mockGetIdToken
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('mock-id-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          uid: 'test-uid-123',
          role: UserRole.Patient,
          email: 'patient@example.com',
          displayName: 'Test Patient',
          createdAt: new Date()
        }
      })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('successfully registers a user with email', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    const result = await registrationService.register(mockFormData);

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'patient@example.com',
      'password123'
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-id-token'
      },
      body: JSON.stringify({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'patient@example.com',
        displayName: 'Test Patient'
      })
    });
    expect(result).toEqual({
      uid: 'test-uid-123',
      user: mockFirebaseUser
    });
  });

  it('successfully registers a user with phone number', async () => {
    const phoneFormData: RegisterFormData = {
      ...mockFormData,
      contactType: 'phone',
      phoneNumber: '+1-555-123-4567',
      email: undefined
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    await registrationService.register(phoneFormData);

    // Should use placeholder email for Firebase Auth
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      '15551234567@temp.pharmarx.com',
      'password123'
    );

    // Should send phone number to backend
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-id-token'
      },
      body: JSON.stringify({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        phoneNumber: '+1-555-123-4567',
        displayName: 'Test Patient'
      })
    });
  });

  it('handles Firebase Auth email-already-in-use error', async () => {
    const authError = {
      code: 'auth/email-already-in-use',
      message: 'Firebase: The email address is already in use by another account.'
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('An account with this email already exists.');
  });

  it('handles Firebase Auth weak-password error', async () => {
    const authError = {
      code: 'auth/weak-password',
      message: 'Firebase: Password should be at least 6 characters'
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Password is too weak. Please choose a stronger password.');
  });

  it('handles Firebase Auth invalid-email error', async () => {
    const authError = {
      code: 'auth/invalid-email',
      message: 'Firebase: The email address is badly formatted.'
    };

    mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Please enter a valid email address.');
  });

  it('handles backend API failure', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'User already exists'
      })
    });

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('User already exists');
  });

  it('handles backend API network error', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    (global.fetch as any).mockRejectedValue(new Error('Network Error'));

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Network error. Please check your connection and try again.');
  });

  it('handles backend API success:false response', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Validation failed'
      })
    });

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Validation failed');
  });

  it('handles Firebase ID token retrieval failure', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    mockGetIdToken.mockRejectedValue(new Error('Token generation failed'));

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Token generation failed');
  });

  it('handles unknown errors gracefully', async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue('unknown error');

    await expect(registrationService.register(mockFormData))
      .rejects.toThrow('Registration failed. Please try again.');
  });

  it('strips non-digits from phone number for email generation', async () => {
    const phoneFormData: RegisterFormData = {
      ...mockFormData,
      contactType: 'phone',
      phoneNumber: '+1 (555) 123-4567',
      email: undefined
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    await registrationService.register(phoneFormData);

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      '15551234567@temp.pharmarx.com',
      'password123'
    );
  });

  it('passes correct role to backend API', async () => {
    const doctorFormData: RegisterFormData = {
      ...mockFormData,
      role: UserRole.Doctor
    };

    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser
    });

    await registrationService.register(doctorFormData);

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-id-token'
      },
      body: JSON.stringify({
        uid: 'test-uid-123',
        role: UserRole.Doctor,
        email: 'patient@example.com',
        displayName: 'Test Patient'
      })
    });
  });
}); 