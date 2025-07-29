import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { authenticationService } from './authenticationService';
import { UserRole } from '@pharmarx/shared-types';

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AuthenticationService', () => {
  const mockUser = {
    uid: 'test-uid',
    getIdToken: vi.fn().mockResolvedValue('mock-token')
  };

  const mockUserProfile = {
    uid: 'test-uid',
    role: UserRole.Patient,
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in with email credentials', async () => {
      // Mock Firebase auth success
      (signInWithEmailAndPassword as any).mockResolvedValue({
        user: mockUser
      });

      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockUserProfile
        })
      });

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authenticationService.login(loginFormData);

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      expect(result.uid).toBe('test-uid');
      expect(result.userProfile).toEqual(mockUserProfile);
    });

    it('successfully logs in with phone credentials', async () => {
      // Mock Firebase auth success
      (signInWithEmailAndPassword as any).mockResolvedValue({
        user: mockUser
      });

      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockUserProfile
        })
      });

      const loginFormData = {
        contactType: 'phone' as const,
        phoneNumber: '+1 (555) 123-4567',
        password: 'password123'
      };

      const result = await authenticationService.login(loginFormData);

      // Should convert phone to email format for Firebase
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        '15551234567@temp.pharmarx.com',
        'password123'
      );
      expect(result.uid).toBe('test-uid');
      expect(result.userProfile).toEqual(mockUserProfile);
    });

    it('handles Firebase auth errors', async () => {
      const authError = {
        code: 'auth/user-not-found',
        message: 'User not found'
      };
      (signInWithEmailAndPassword as any).mockRejectedValue(authError);

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authenticationService.login(loginFormData)).rejects.toThrow(
        'No account found with these credentials.'
      );
    });

    it('handles wrong password error', async () => {
      const authError = {
        code: 'auth/wrong-password',
        message: 'Wrong password'
      };
      (signInWithEmailAndPassword as any).mockRejectedValue(authError);

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(authenticationService.login(loginFormData)).rejects.toThrow(
        'Incorrect password. Please try again.'
      );
    });

    it('handles API errors when getting user profile', async () => {
      // Mock Firebase auth success
      (signInWithEmailAndPassword as any).mockResolvedValue({
        user: mockUser
      });

      // Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'User profile not found'
        })
      });

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authenticationService.login(loginFormData)).rejects.toThrow(
        'User profile not found'
      );
    });
  });

  describe('logout', () => {
    it('successfully logs out user', async () => {
      (signOut as any).mockResolvedValue(undefined);

      await expect(authenticationService.logout()).resolves.toBeUndefined();
      expect(signOut).toHaveBeenCalled();
    });

    it('handles logout errors', async () => {
      const logoutError = new Error('Logout failed');
      (signOut as any).mockRejectedValue(logoutError);

      await expect(authenticationService.logout()).rejects.toThrow(
        'Failed to sign out. Please try again.'
      );
    });
  });

  describe('getCurrentAuthState', () => {
    it('returns unauthenticated state when no current user', async () => {
      // Mock no current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = null;

      const authState = await authenticationService.getCurrentAuthState();

      expect(authState).toEqual({
        isAuthenticated: false,
        user: null,
        token: null
      });
    });

    it('returns authenticated state when user is logged in', async () => {
      // Mock current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = mockUser;

      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockUserProfile
        })
      });

      const authState = await authenticationService.getCurrentAuthState();

      expect(authState).toEqual({
        isAuthenticated: true,
        user: mockUserProfile,
        token: 'mock-token'
      });
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes token', async () => {
      // Mock current user
      const { auth } = await import('../config/firebase');
      const mockCurrentUser = {
        getIdToken: vi.fn().mockResolvedValue('new-token')
      };
      auth.currentUser = mockCurrentUser;

      const newToken = await authenticationService.refreshToken();

      expect(mockCurrentUser.getIdToken).toHaveBeenCalledWith(true);
      expect(newToken).toBe('new-token');
    });

    it('throws error when no current user', async () => {
      // Mock no current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = null;

      await expect(authenticationService.refreshToken()).rejects.toThrow(
        'No authenticated user found'
      );
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the specified role', async () => {
      // Mock current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = mockUser;

      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockUserProfile
        })
      });

      const hasPatientRole = await authenticationService.hasRole(UserRole.Patient);
      expect(hasPatientRole).toBe(true);

      const hasDoctorRole = await authenticationService.hasRole(UserRole.Doctor);
      expect(hasDoctorRole).toBe(false);
    });

    it('returns false when not authenticated', async () => {
      // Mock no current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = null;

      const hasRole = await authenticationService.hasRole(UserRole.Patient);
      expect(hasRole).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('returns user role when authenticated', async () => {
      // Mock current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = mockUser;

      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockUserProfile
        })
      });

      const role = await authenticationService.getUserRole();
      expect(role).toBe(UserRole.Patient);
    });

    it('returns null when not authenticated', async () => {
      // Mock no current user
      const { auth } = await import('../config/firebase');
      auth.currentUser = null;

      const role = await authenticationService.getUserRole();
      expect(role).toBe(null);
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      const networkError = new Error('NetworkError');
      networkError.name = 'NetworkError';
      (signInWithEmailAndPassword as any).mockRejectedValue(networkError);

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authenticationService.login(loginFormData)).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );
    });

    it('handles unknown errors with generic message', async () => {
      const unknownError = { someProperty: 'unknown error' };
      (signInWithEmailAndPassword as any).mockRejectedValue(unknownError);

      const loginFormData = {
        contactType: 'email' as const,
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(authenticationService.login(loginFormData)).rejects.toThrow(
        'Authentication failed. Please try again.'
      );
    });
  });
}); 