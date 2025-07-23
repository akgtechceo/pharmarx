import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { UserRole, CreateUserInput } from '@pharmarx/shared-types';
import userRoutes from './userRoutes';
import userService from './users';

// Mock the user service
vi.mock('./users', () => ({
  default: {
    createUser: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getUsersByRole: vi.fn(),
    userExists: vi.fn()
  }
}));

describe('User Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);
  });

  describe('POST /users', () => {
    const validUserData = {
      uid: 'test-uid-123',
      role: UserRole.Patient,
      email: 'test@example.com',
      displayName: 'John Doe'
    };

    it('should create a user successfully', async () => {
      const expectedUser = {
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      };

      (userService.getUserById as any).mockResolvedValue(null);
      (userService.createUser as any).mockResolvedValue(expectedUser);

      const response = await request(app)
        .post('/users')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...expectedUser,
          createdAt: expectedUser.createdAt.toISOString()
        }
      });

      expect(userService.getUserById).toHaveBeenCalledWith('test-uid-123');
      expect(userService.createUser).toHaveBeenCalledWith('test-uid-123', {
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe'
      });
    });

    it('should reject request without UID', async () => {
      const userDataWithoutUid = {
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe'
      };

      const response = await request(app)
        .post('/users')
        .send(userDataWithoutUid)
        .expect(400);

      expect(response.body).toEqual({
        error: 'UID is required'
      });
    });

    it('should reject request if user already exists', async () => {
      (userService.getUserById as any).mockResolvedValue({
        uid: 'test-uid-123',
        role: UserRole.Patient
      });

      const response = await request(app)
        .post('/users')
        .send(validUserData)
        .expect(409);

      expect(response.body).toEqual({
        error: 'User already exists'
      });
    });

    it('should handle service errors', async () => {
      (userService.getUserById as any).mockResolvedValue(null);
      (userService.createUser as any).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/users')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Service error'
      });
    });

    it('should handle unknown errors', async () => {
      (userService.getUserById as any).mockResolvedValue(null);
      (userService.createUser as any).mockRejectedValue('Unknown error');

      const response = await request(app)
        .post('/users')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Failed to create user'
      });
    });
  });

  describe('GET /users/:uid', () => {
    it('should return user when found', async () => {
      const user = {
        uid: 'test-uid-123',
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      };

      (userService.getUserById as any).mockResolvedValue(user);

      const response = await request(app)
        .get('/users/test-uid-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...user,
          createdAt: user.createdAt.toISOString()
        }
      });

      expect(userService.getUserById).toHaveBeenCalledWith('test-uid-123');
    });

    it('should return 404 when user not found', async () => {
      (userService.getUserById as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/users/non-existent-uid')
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    it('should handle service errors', async () => {
      (userService.getUserById as any).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/users/test-uid-123')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Service error'
      });
    });
  });

  describe('PUT /users/:uid', () => {
    it('should update user successfully', async () => {
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

      (userService.updateUser as any).mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/users/test-uid-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...updatedUser,
          createdAt: updatedUser.createdAt.toISOString()
        }
      });

      expect(userService.updateUser).toHaveBeenCalledWith('test-uid-123', updateData);
    });

    it('should return 404 when user not found', async () => {
      (userService.updateUser as any).mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .put('/users/non-existent-uid')
        .send({ displayName: 'New Name' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    it('should handle validation errors', async () => {
      (userService.updateUser as any).mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .put('/users/test-uid-123')
        .send({ displayName: 'New Name' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation failed'
      });
    });
  });

  describe('DELETE /users/:uid', () => {
    it('should delete user successfully', async () => {
      (userService.deleteUser as any).mockResolvedValue(true);

      const response = await request(app)
        .delete('/users/test-uid-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'User deleted successfully'
      });

      expect(userService.deleteUser).toHaveBeenCalledWith('test-uid-123');
    });

    it('should return 404 when user not found', async () => {
      (userService.deleteUser as any).mockResolvedValue(false);

      const response = await request(app)
        .delete('/users/non-existent-uid')
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    it('should handle service errors', async () => {
      (userService.deleteUser as any).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .delete('/users/test-uid-123')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Service error'
      });
    });
  });

  describe('GET /users/role/:role', () => {
    it('should return users by role', async () => {
      const users = [
        {
          uid: 'doctor-1',
          role: UserRole.Doctor,
          email: 'doctor1@hospital.com',
          displayName: 'Dr. Smith',
          createdAt: new Date()
        },
        {
          uid: 'doctor-2',
          role: UserRole.Doctor,
          phoneNumber: '555-123-4567',
          displayName: 'Dr. Jones',
          createdAt: new Date()
        }
      ];

      (userService.getUsersByRole as any).mockResolvedValue(users);

      const response = await request(app)
        .get('/users/role/doctor')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString()
        }))
      });

      expect(userService.getUsersByRole).toHaveBeenCalledWith(UserRole.Doctor);
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .get('/users/role/invalid-role')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid user role'
      });
    });

    it('should handle service errors', async () => {
      (userService.getUsersByRole as any).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/users/role/patient')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Service error'
      });
    });
  });

  describe('GET /users/:uid/exists', () => {
    it('should return true when user exists', async () => {
      (userService.userExists as any).mockResolvedValue(true);

      const response = await request(app)
        .get('/users/test-uid-123/exists')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          exists: true
        }
      });

      expect(userService.userExists).toHaveBeenCalledWith('test-uid-123');
    });

    it('should return false when user does not exist', async () => {
      (userService.userExists as any).mockResolvedValue(false);

      const response = await request(app)
        .get('/users/non-existent-uid/exists')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          exists: false
        }
      });
    });

    it('should handle service errors', async () => {
      (userService.userExists as any).mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/users/test-uid-123/exists')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Service error'
      });
    });
  });
}); 