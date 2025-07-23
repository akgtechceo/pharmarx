import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authRoutes from './authRoutes';
import userService from './users';
import { UserRole } from '@pharmarx/shared-types';

// Mock Firebase Admin
const mockVerifyIdToken = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockInitializeApp = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: mockInitializeApp,
    auth: () => ({
      verifyIdToken: mockVerifyIdToken,
      setCustomUserClaims: mockSetCustomUserClaims
    }),
    credential: {
      applicationDefault: () => ({})
    }
  }
}));

// Mock user service
vi.mock('./users', () => ({
  default: {
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn()
  }
}));

const mockUserService = userService as any;

describe('Auth Routes', () => {
  let app: express.Application;
  const mockToken = 'mock-firebase-token';
  const mockDecodedToken = {
    uid: 'test-uid-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      uid: 'test-uid-123',
      role: UserRole.Patient,
      email: 'patient@example.com',
      displayName: 'Test Patient'
    };

    it('successfully registers a new user with email', async () => {
      mockUserService.getUserById.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'patient@example.com',
        displayName: 'Test Patient',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          uid: 'test-uid-123',
          role: UserRole.Patient,
          email: 'patient@example.com',
          displayName: 'Test Patient'
        }),
        message: 'User registered successfully'
      });

      expect(mockUserService.createUser).toHaveBeenCalledWith(
        'test-uid-123',
        {
          role: UserRole.Patient,
          email: 'patient@example.com',
          displayName: 'Test Patient'
        }
      );

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
        'test-uid-123',
        { role: UserRole.Patient }
      );
    });

    it('successfully registers a new user with phone number', async () => {
      const phoneData = {
        ...validRegistrationData,
        phoneNumber: '+1-555-123-4567',
        email: undefined
      };

      mockUserService.getUserById.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        phoneNumber: '+1-555-123-4567',
        displayName: 'Test Patient',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(phoneData);

      expect(response.status).toBe(201);
      expect(mockUserService.createUser).toHaveBeenCalledWith(
        'test-uid-123',
        {
          role: UserRole.Patient,
          phoneNumber: '+1-555-123-4567',
          displayName: 'Test Patient'
        }
      );
    });

    it('returns 401 without authorization header', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('returns 401 with invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer invalid-token`)
        .send(validRegistrationData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('returns 400 without uid', async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.uid;

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('UID is required');
    });

    it('returns 400 with invalid role', async () => {
      const invalidData = {
        ...validRegistrationData,
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Valid role is required');
    });

    it('returns 400 without display name', async () => {
      const invalidData = {
        ...validRegistrationData,
        displayName: ''
      };

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Display name is required');
    });

    it('returns 400 without email or phone number', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: undefined
      };

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Either email or phone number must be provided');
    });

    it('returns 403 when token UID does not match request UID', async () => {
      const mismatchedData = {
        ...validRegistrationData,
        uid: 'different-uid'
      };

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(mismatchedData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Token UID does not match request UID');
    });

    it('returns 409 when user already exists', async () => {
      mockUserService.getUserById.mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'patient@example.com',
        displayName: 'Existing User',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User already exists');
    });

    it('handles user service validation errors', async () => {
      mockUserService.getUserById.mockResolvedValue(null);
      mockUserService.createUser.mockRejectedValue(
        new Error('Validation failed: email must be a valid email address format')
      );

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validRegistrationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });

    it('handles user service general errors', async () => {
      mockUserService.getUserById.mockResolvedValue(null);
      mockUserService.createUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validRegistrationData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Registration failed. Please try again.');
    });

    it('continues registration even if custom claims fail', async () => {
      mockUserService.getUserById.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'patient@example.com',
        displayName: 'Test Patient',
        createdAt: new Date()
      });
      mockSetCustomUserClaims.mockRejectedValue(new Error('Claims error'));

      const response = await request(app)
        .post('/auth/register')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('returns current user profile', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'patient@example.com',
        displayName: 'Test Patient',
        createdAt: new Date()
      };

      mockUserService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining(mockUser)
      });

      expect(mockUserService.getUserById).toHaveBeenCalledWith('test-uid-123');
    });

    it('returns 401 without valid token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns 404 when user profile not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User profile not found');
    });
  });

  describe('PUT /auth/profile', () => {
    it('successfully updates user profile', async () => {
      const updateData = {
        displayName: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = {
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'updated@example.com',
        displayName: 'Updated Name',
        createdAt: new Date()
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining(updatedUser),
        message: 'Profile updated successfully'
      });

      expect(mockUserService.updateUser).toHaveBeenCalledWith('test-uid-123', updateData);
    });

    it('removes uid from update data', async () => {
      const updateData = {
        uid: 'should-be-removed',
        displayName: 'Updated Name'
      };

      mockUserService.updateUser.mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient,
        displayName: 'Updated Name',
        createdAt: new Date()
      });

      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData);

      expect(mockUserService.updateUser).toHaveBeenCalledWith('test-uid-123', {
        displayName: 'Updated Name'
      });
    });

    it('returns 404 when user not found', async () => {
      mockUserService.updateUser.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ displayName: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });
}); 