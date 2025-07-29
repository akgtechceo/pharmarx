import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../index';
import profileService from './profiles';
import { PatientProfile, CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';

// Mock the profile service
vi.mock('./profiles');
const mockProfileService = vi.mocked(profileService);

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { uid: 'test-caregiver-uid', role: 'caregiver' };
    next();
  }
}));

describe('Profile Routes', () => {
  const mockProfile: PatientProfile = {
    profileId: 'test-profile-id',
    managedByUid: 'test-caregiver-uid',
    patientName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'),
    insuranceDetails: {
      provider: 'Test Insurance',
      policyNumber: 'POL123456'
    },
    createdAt: new Date(),
    updatedAt: new Date()
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
    patientName: 'Jane Doe',
    dateOfBirth: '1992-01-01'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/profiles', () => {
    it('should create a new profile successfully', async () => {
      mockProfileService.createProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
      expect(mockProfileService.createProfile).toHaveBeenCalledWith('test-caregiver-uid', mockCreateRequest);
    });

    it('should return 400 for invalid profile data', async () => {
      const invalidRequest = {
        patientName: '', // Invalid: empty name
        dateOfBirth: 'invalid-date' // Invalid: not a valid date
      };

      mockProfileService.createProfile.mockRejectedValue(new Error('Validation failed: patientName is required and must be a non-empty string'));

      const response = await request(app)
        .post('/api/profiles')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 404 when user not found', async () => {
      mockProfileService.createProfile.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 when user is not a caregiver', async () => {
      mockProfileService.createProfile.mockRejectedValue(new Error('Only caregivers can create patient profiles'));

      const response = await request(app)
        .post('/api/profiles')
        .send(mockCreateRequest)
        .expect(400);

      expect(response.body.error).toBe('Only caregivers can create patient profiles');
    });
  });

  describe('GET /api/profiles', () => {
    it('should return all profiles for caregiver', async () => {
      const mockProfiles = [mockProfile];
      mockProfileService.getProfilesByCaregiver.mockResolvedValue(mockProfiles);

      const response = await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toEqual(mockProfiles);
      expect(mockProfileService.getProfilesByCaregiver).toHaveBeenCalledWith('test-caregiver-uid');
    });

    it('should return empty array when no profiles exist', async () => {
      mockProfileService.getProfilesByCaregiver.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockProfileService.getProfilesByCaregiver.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/profiles')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/profiles/:profileId', () => {
    it('should return specific profile by ID', async () => {
      mockProfileService.getProfileById.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/profiles/test-profile-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('test-profile-id');
    });

    it('should return 404 when profile not found', async () => {
      mockProfileService.getProfileById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/profiles/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 403 when profile does not belong to caregiver', async () => {
      const otherProfile = { ...mockProfile, managedByUid: 'other-caregiver-uid' };
      mockProfileService.getProfileById.mockResolvedValue(otherProfile);

      const response = await request(app)
        .get('/api/profiles/test-profile-id')
        .expect(403);

      expect(response.body.error).toBe('Unauthorized: Profile does not belong to this caregiver');
    });
  });

  describe('PUT /api/profiles/:profileId', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, ...mockUpdateRequest };
      mockProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(mockUpdateRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedProfile);
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('test-profile-id', 'test-caregiver-uid', mockUpdateRequest);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdate = {
        patientName: '', // Invalid: empty name
        dateOfBirth: 'invalid-date' // Invalid: not a valid date
      };

      mockProfileService.updateProfile.mockRejectedValue(new Error('Validation failed: patientName must be a non-empty string when provided'));

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 404 when profile not found', async () => {
      mockProfileService.updateProfile.mockRejectedValue(new Error('Profile not found'));

      const response = await request(app)
        .put('/api/profiles/non-existent-id')
        .send(mockUpdateRequest)
        .expect(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 400 when profile does not belong to caregiver', async () => {
      mockProfileService.updateProfile.mockRejectedValue(new Error('Unauthorized: Profile does not belong to this caregiver'));

      const response = await request(app)
        .put('/api/profiles/test-profile-id')
        .send(mockUpdateRequest)
        .expect(400);

      expect(response.body.error).toBe('Unauthorized: Profile does not belong to this caregiver');
    });
  });

  describe('DELETE /api/profiles/:profileId', () => {
    it('should delete profile successfully', async () => {
      mockProfileService.deleteProfile.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile deleted successfully');
      expect(mockProfileService.deleteProfile).toHaveBeenCalledWith('test-profile-id', 'test-caregiver-uid');
    });

    it('should return 404 when profile not found', async () => {
      mockProfileService.deleteProfile.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/profiles/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 400 when profile has associated orders', async () => {
      mockProfileService.deleteProfile.mockRejectedValue(new Error('Cannot delete profile: Has associated prescription orders'));

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(400);

      expect(response.body.error).toBe('Cannot delete profile: Has associated prescription orders');
    });

    it('should return 400 when profile does not belong to caregiver', async () => {
      mockProfileService.deleteProfile.mockRejectedValue(new Error('Unauthorized: Profile does not belong to this caregiver'));

      const response = await request(app)
        .delete('/api/profiles/test-profile-id')
        .expect(400);

      expect(response.body.error).toBe('Unauthorized: Profile does not belong to this caregiver');
    });
  });

  describe('GET /api/profiles/:profileId/exists', () => {
    it('should return true when profile exists and belongs to caregiver', async () => {
      mockProfileService.profileExists.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/profiles/test-profile-id/exists')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      expect(mockProfileService.profileExists).toHaveBeenCalledWith('test-profile-id', 'test-caregiver-uid');
    });

    it('should return false when profile does not exist', async () => {
      mockProfileService.profileExists.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/profiles/non-existent-id/exists')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
    });

    it('should handle server errors', async () => {
      mockProfileService.profileExists.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/profiles/test-profile-id/exists')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });
});