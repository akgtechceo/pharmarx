import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../index';
import { db } from './database';
import { PatientProfile, CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { uid: 'test-caregiver-uid', role: 'caregiver' };
    next();
  }
}));

// Mock database
vi.mock('./database', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      })),
      where: vi.fn(() => ({
        get: vi.fn()
      })),
      add: vi.fn()
    }))
  }
}));

describe('Profile Routes Integration Tests', () => {
  const mockProfile: PatientProfile = {
    profileId: 'test-profile-id',
    managedByUid: 'test-caregiver-uid',
    patientName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'),
    insuranceDetails: {
      provider: 'Test Insurance',
      policyNumber: 'POL123456'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockCreateRequest: CreateProfileRequest = {
    patientName: 'John Doe',
    dateOfBirth: '1990-01-01',
    insuranceDetails: {
      provider: 'Test Insurance',
      policyNumber: 'POL123456'
    }
  };

  const mockUpdateRequest: UpdateProfileRequest = {
    patientName: 'John Smith',
    dateOfBirth: '1990-01-01'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/profiles', () => {
    it('should create a new profile successfully', async () => {
      // Mock user exists
      const mockUserDoc = {
        exists: true,
        data: () => ({ role: 'caregiver' })
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockUserDoc)
        })),
        add: vi.fn().mockResolvedValue({ id: 'test-profile-id' })
      });

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientName).toBe('John Doe');
      expect(response.body.data.profileId).toBe('test-profile-id');
    });

    it('should return 400 for invalid request data', async () => {
      const invalidRequest = {
        patientName: '', // Empty name
        dateOfBirth: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/profiles')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for future date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const invalidRequest = {
        ...mockCreateRequest,
        dateOfBirth: futureDate.toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/profiles')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Date of birth cannot be in the future');
    });

    it('should return 404 if user not found', async () => {
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false })
        }))
      });

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 403 if user is not a caregiver', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({ role: 'patient' })
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockUserDoc)
        }))
      });

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(403);

      expect(response.body.error).toBe('Only caregivers can manage patient profiles');
    });
  });

  describe('GET /api/profiles', () => {
    it('should return all profiles for caregiver', async () => {
      const mockProfiles = [mockProfile];
      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            docs: mockProfiles.map(profile => ({
              id: profile.profileId,
              data: () => profile
            }))
          })
        }))
      });

      const response = await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toHaveLength(1);
      expect(response.body.data.profiles[0].patientName).toBe('John Doe');
    });

    it('should return empty array when no profiles exist', async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            docs: []
          })
        }))
      });

      const response = await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toHaveLength(0);
    });
  });

  describe('PUT /api/profiles/:profileId', () => {
    it('should update profile successfully', async () => {
      const mockProfileDoc = {
        exists: true,
        data: () => mockProfile,
        update: vi.fn().mockResolvedValue(undefined)
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockProfileDoc),
          update: vi.fn().mockResolvedValue(undefined)
        }))
      });

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(mockUpdateRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientName).toBe('John Smith');
    });

    it('should return 404 if profile not found', async () => {
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false })
        }))
      });

      const response = await request(app)
        .put('/api/profiles/non-existent-id')
        .send(mockUpdateRequest)
        .expect(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 403 if profile does not belong to caregiver', async () => {
      const otherProfile = {
        ...mockProfile,
        managedByUid: 'other-caregiver-uid'
      };
      const mockProfileDoc = {
        exists: true,
        data: () => otherProfile
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockProfileDoc)
        }))
      });

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(mockUpdateRequest)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidRequest = {
        patientName: '', // Empty name
        dateOfBirth: '1990-01-01'
      };

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/profiles/:profileId', () => {
    it('should delete profile successfully', async () => {
      const mockProfileDoc = {
        exists: true,
        data: () => mockProfile,
        delete: vi.fn().mockResolvedValue(undefined)
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockProfileDoc),
          delete: vi.fn().mockResolvedValue(undefined)
        })),
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [] }) // No associated orders
        }))
      });

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile deleted successfully');
    });

    it('should return 404 if profile not found', async () => {
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: false })
        }))
      });

      const response = await request(app)
        .delete('/api/profiles/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 403 if profile does not belong to caregiver', async () => {
      const otherProfile = {
        ...mockProfile,
        managedByUid: 'other-caregiver-uid'
      };
      const mockProfileDoc = {
        exists: true,
        data: () => otherProfile
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockProfileDoc)
        }))
      });

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });

    it('should return 400 if profile has associated orders', async () => {
      const mockProfileDoc = {
        exists: true,
        data: () => mockProfile
      };
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(mockProfileDoc)
        })),
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ 
            docs: [{ id: 'order-1' }] // Has associated orders
          })
        }))
      });

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(400);

      expect(response.body.error).toBe('Cannot delete profile with associated prescription orders');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          get: vi.fn().mockRejectedValue(new Error('Database error'))
        }))
      });

      const response = await request(app)
        .get('/api/profiles')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle validation errors for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error).toBe('Invalid request body');
    });
  });
});