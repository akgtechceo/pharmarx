import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User, UserRole, CreateUserInput } from '@pharmarx/shared-types';
import userService from './users';
import databaseService from './database';

// Mock the database service
vi.mock('./database', () => ({
  default: {
    getDb: vi.fn()
  }
}));

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date }))
      }
    }
  }
}));

// Mock types
interface MockDoc {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockCollection {
  doc: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}

interface MockDb {
  collection: ReturnType<typeof vi.fn>;
}

describe('UserService', () => {
  let mockDb: MockDb;
  let mockCollection: MockCollection;
  let mockDoc: MockDoc;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Firestore methods
    mockDoc = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc),
      where: vi.fn().mockReturnThis(),
      get: vi.fn()
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };

    // Setup database service mock
    (databaseService.getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  describe('createUser', () => {
    const validUserInput: CreateUserInput = {
      role: UserRole.Patient,
      email: 'test@example.com',
      displayName: 'John Doe'
    };

    it('should create a user successfully', async () => {
      const uid = 'test-uid-123';
      
      const result = await userService.createUser(uid, validUserInput);

      expect(result).toEqual({
        uid,
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: expect.any(Date)
      });

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith(uid);
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should create a user with phone number', async () => {
      const uid = 'test-uid-456';
      const userInputWithPhone: CreateUserInput = {
        role: UserRole.Doctor,
        phoneNumber: '+1-555-123-4567',
        displayName: 'Dr. Smith'
      };

      const result = await userService.createUser(uid, userInputWithPhone);

      expect(result.uid).toBe(uid);
      expect(result.phoneNumber).toBe('+1-555-123-4567');
      expect(result.email).toBeUndefined();
    });

    it('should reject invalid user data', async () => {
      const invalidInput = {
        role: 'invalid-role' as UserRole,
        displayName: ''
      };

      await expect(userService.createUser('test-uid', invalidInput as CreateUserInput))
        .rejects.toThrow('Validation failed');
    });

    it('should handle database errors', async () => {
      const uid = 'test-uid-123';
      mockDoc.set.mockRejectedValue(new Error('Firestore error'));

      await expect(userService.createUser(uid, validUserInput))
        .rejects.toThrow('Failed to create user: Firestore error');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const uid = 'test-uid-123';
      const userData = {
        uid,
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: { toDate: () => new Date('2023-01-01') }
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => userData
      });

      const result = await userService.getUserById(uid);

      expect(result).toEqual({
        uid,
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date('2023-01-01')
      });

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith(uid);
      expect(mockDoc.get).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      const uid = 'non-existent-uid';
      
      mockDoc.get.mockResolvedValue({
        exists: false
      });

      const result = await userService.getUserById(uid);
      expect(result).toBeNull();
    });

    it('should return null when document has no data', async () => {
      const uid = 'test-uid-123';
      
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => null
      });

      const result = await userService.getUserById(uid);
      expect(result).toBeNull();
    });

    it('should reject invalid uid', async () => {
      await expect(userService.getUserById(''))
        .rejects.toThrow('Valid UID is required');

      await expect(userService.getUserById(null as unknown as string))
        .rejects.toThrow('Valid UID is required');
    });

    it('should handle database errors', async () => {
      const uid = 'test-uid-123';
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(userService.getUserById(uid))
        .rejects.toThrow('Failed to get user: Firestore error');
    });
  });

  describe('updateUser', () => {
    const existingUser: User = {
      uid: 'test-uid-123',
      role: UserRole.Patient,
      email: 'old@example.com',
      displayName: 'Old Name',
      createdAt: new Date('2023-01-01')
    };

    beforeEach(() => {
      // Mock getUserById to return existing user
      vi.spyOn(userService, 'getUserById').mockResolvedValue(existingUser);
    });

    it('should update user successfully', async () => {
      const uid = 'test-uid-123';
      const updateData = {
        displayName: 'New Name',
        email: 'new@example.com'
      };

      const result = await userService.updateUser(uid, updateData);

      expect(result).toEqual({
        uid,
        role: UserRole.Patient,
        email: 'new@example.com',
        displayName: 'New Name',
        createdAt: new Date('2023-01-01')
      });

      expect(mockDoc.update).toHaveBeenCalledWith({
        role: UserRole.Patient,
        email: 'new@example.com',
        phoneNumber: undefined,
        displayName: 'New Name'
      });
    });

    it('should reject update for non-existent user', async () => {
      vi.spyOn(userService, 'getUserById').mockResolvedValue(null);

      await expect(userService.updateUser('non-existent', { displayName: 'New Name' }))
        .rejects.toThrow('User not found');
    });

    it('should handle database errors', async () => {
      const uid = 'test-uid-123';
      mockDoc.update.mockRejectedValue(new Error('Firestore error'));

      await expect(userService.updateUser(uid, { displayName: 'New Name' }))
        .rejects.toThrow('Failed to update user: Firestore error');
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const uid = 'test-uid-123';
      vi.spyOn(userService, 'getUserById').mockResolvedValue({
        uid,
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      });

      const result = await userService.deleteUser(uid);

      expect(result).toBe(true);
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should return false for non-existent user', async () => {
      const uid = 'non-existent-uid';
      vi.spyOn(userService, 'getUserById').mockResolvedValue(null);

      const result = await userService.deleteUser(uid);
      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const uid = 'test-uid-123';
      vi.spyOn(userService, 'getUserById').mockResolvedValue({
        uid,
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      });
      
      mockDoc.delete.mockRejectedValue(new Error('Firestore error'));

      await expect(userService.deleteUser(uid))
        .rejects.toThrow('Failed to delete user: Firestore error');
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const mockUsers = [
        {
          uid: 'doctor-1',
          role: UserRole.Doctor,
          email: 'doctor1@hospital.com',
          displayName: 'Dr. Smith',
          createdAt: { toDate: () => new Date('2023-01-01') }
        },
        {
          uid: 'doctor-2',
          role: UserRole.Doctor,
          phoneNumber: '555-123-4567',
          displayName: 'Dr. Jones',
          createdAt: { toDate: () => new Date('2023-01-02') }
        }
      ];

      const mockSnapshot = {
        forEach: vi.fn((callback) => {
          mockUsers.forEach((userData) => {
            callback({ data: () => userData });
          });
        })
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await userService.getUsersByRole(UserRole.Doctor);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe(UserRole.Doctor);
      expect(result[1].role).toBe(UserRole.Doctor);
      expect(mockCollection.where).toHaveBeenCalledWith('role', '==', UserRole.Doctor);
    });

    it('should reject invalid role', async () => {
      await expect(userService.getUsersByRole('invalid-role' as UserRole))
        .rejects.toThrow('Invalid user role');
    });

    it('should handle database errors', async () => {
      mockCollection.get.mockRejectedValue(new Error('Firestore error'));

      await expect(userService.getUsersByRole(UserRole.Patient))
        .rejects.toThrow('Failed to get users by role: Firestore error');
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      vi.spyOn(userService, 'getUserById').mockResolvedValue({
        uid: 'test-uid',
        role: UserRole.Patient,
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date()
      });

      const result = await userService.userExists('test-uid');
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      vi.spyOn(userService, 'getUserById').mockResolvedValue(null);

      const result = await userService.userExists('non-existent-uid');
      expect(result).toBe(false);
    });

    it('should return false on errors', async () => {
      vi.spyOn(userService, 'getUserById').mockRejectedValue(new Error('Database error'));

      const result = await userService.userExists('test-uid');
      expect(result).toBe(false);
    });
  });
}); 