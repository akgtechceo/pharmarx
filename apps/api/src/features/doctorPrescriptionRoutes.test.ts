import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import doctorPrescriptionRoutes from './doctorPrescriptionRoutes';
import { doctorPrescriptionService } from './doctorPrescriptionService';
import { UserRole } from '@pharmarx/shared-types';

// Mock the doctor prescription service
vi.mock('./doctorPrescriptionService', () => ({
  doctorPrescriptionService: {
    searchPatients: vi.fn(),
    submitPrescription: vi.fn(),
    getPrescriptionHistory: vi.fn()
  }
}));

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn()
    })),
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    }))
  }
}));

describe('Doctor Prescription Routes', () => {
  let app: express.Application;
  let mockVerifyIdToken: any;
  let mockUserDoc: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/doctor', doctorPrescriptionRoutes);

    // Setup Firebase Auth mock
    mockVerifyIdToken = vi.fn();
    const mockAuth = vi.fn(() => ({
      verifyIdToken: mockVerifyIdToken
    }));
    vi.mocked(require('firebase-admin').default.auth).mockImplementation(mockAuth);

    // Setup Firestore mock
    mockUserDoc = {
      exists: true,
      data: () => ({
        role: UserRole.Doctor,
        displayName: 'Dr. Smith',
        email: 'doctor@example.com'
      })
    };

    const mockDoc = vi.fn(() => ({
      get: vi.fn().mockResolvedValue(mockUserDoc)
    }));
    const mockCollection = vi.fn(() => ({
      doc: mockDoc
    }));
    const mockFirestore = vi.fn(() => ({
      collection: mockCollection
    }));
    vi.mocked(require('firebase-admin').default.firestore).mockImplementation(mockFirestore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/doctor/patients?query=test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization header required'
      });
    });

    it('should return 401 for invalid token format', async () => {
      const response = await request(app)
        .get('/api/doctor/patients?query=test')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization header required'
      });
    });

    it('should return 401 for invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/doctor/patients?query=test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid authentication token'
      });
    });

    it('should return 403 for non-doctor role', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });
      mockUserDoc.data = () => ({
        role: UserRole.Patient,
        displayName: 'John Doe',
        email: 'patient@example.com'
      });

      const response = await request(app)
        .get('/api/doctor/patients?query=test')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Doctor role required'
      });
    });
  });

  describe('GET /api/doctor/patients', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'doctor123' });
    });

    it('should search patients successfully', async () => {
      const mockPatients = [
        {
          profileId: 'profile1',
          patientName: 'John Doe',
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '+1234567890',
          email: 'john@example.com',
          insuranceDetails: { provider: 'Blue Cross', policyNumber: '12345' }
        }
      ];

      vi.mocked(doctorPrescriptionService.searchPatients).mockResolvedValue(mockPatients);

      const response = await request(app)
        .get('/api/doctor/patients?query=John&searchType=name&limit=5')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPatients,
        message: 'Found 1 patients matching "John"'
      });

      expect(doctorPrescriptionService.searchPatients).toHaveBeenCalledWith({
        query: 'John',
        searchType: 'name',
        limit: 5
      });
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/doctor/patients')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Query parameter is required'
      });
    });

    it('should return 400 for invalid search type', async () => {
      const response = await request(app)
        .get('/api/doctor/patients?query=test&searchType=invalid')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid search type. Must be one of: name, phone, email, all'
      });
    });

    it('should handle service errors', async () => {
      vi.mocked(doctorPrescriptionService.searchPatients).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/doctor/patients?query=test')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error during patient search'
      });
    });
  });

  describe('POST /api/doctor/prescriptions', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'doctor123' });
    });

    it('should submit prescription successfully', async () => {
      const prescriptionData = {
        patientProfileId: 'patient123',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 2
        },
        prescriptionNotes: 'For headache relief'
      };

      const mockPrescription = {
        prescriptionId: 'prescription123',
        doctorUid: 'doctor123',
        patientProfileId: 'patient123',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 2,
          refillsRemaining: 2
        },
        prescriptionNotes: 'For headache relief',
        submittedAt: new Date('2024-01-01'),
        status: 'submitted'
      };

      vi.mocked(doctorPrescriptionService.submitPrescription).mockResolvedValue(mockPrescription);

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .send(prescriptionData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockPrescription,
        message: 'Prescription submitted successfully'
      });

      expect(doctorPrescriptionService.submitPrescription).toHaveBeenCalledWith('doctor123', prescriptionData);
    });

    it('should return 400 for missing patient profile ID', async () => {
      const prescriptionData = {
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 2
        }
      };

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .send(prescriptionData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Patient profile ID is required'
      });
    });

    it('should return 400 for missing medication details', async () => {
      const prescriptionData = {
        patientProfileId: 'patient123'
      };

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .send(prescriptionData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Medication details are required'
      });
    });

    it('should return 400 for invalid refills authorized', async () => {
      const prescriptionData = {
        patientProfileId: 'patient123',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: -1
        }
      };

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .send(prescriptionData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Refills authorized must be a non-negative number'
      });
    });

    it('should return 404 for non-existent patient profile', async () => {
      const prescriptionData = {
        patientProfileId: 'nonexistent',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 2
        }
      };

      vi.mocked(doctorPrescriptionService.submitPrescription).mockRejectedValue(new Error('Patient profile not found'));

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .send(prescriptionData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Patient profile not found'
      });
    });
  });

  describe('GET /api/doctor/prescriptions', () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'doctor123' });
    });

    it('should get prescription history successfully', async () => {
      const mockHistory = {
        prescriptions: [
          {
            prescriptionId: 'prescription123',
            doctorUid: 'doctor123',
            patientProfileId: 'patient123',
            medicationDetails: {
              name: 'Aspirin',
              dosage: '100mg',
              quantity: 30,
              instructions: 'Take 1 tablet daily',
              refillsAuthorized: 2,
              refillsRemaining: 1
            },
            prescriptionNotes: 'For headache relief',
            submittedAt: new Date('2024-01-01'),
            status: 'submitted'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          hasMore: false
        }
      };

      vi.mocked(doctorPrescriptionService.getPrescriptionHistory).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/doctor/prescriptions?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHistory,
        message: 'Retrieved 1 prescriptions'
      });

      expect(doctorPrescriptionService.getPrescriptionHistory).toHaveBeenCalledWith('doctor123', 1, 10);
    });

    it('should return 400 for invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/doctor/prescriptions?page=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Page must be a positive integer'
      });
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/doctor/prescriptions?limit=100')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Limit must be between 1 and 50'
      });
    });

    it('should use default pagination values', async () => {
      const mockHistory = {
        prescriptions: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false
        }
      };

      vi.mocked(doctorPrescriptionService.getPrescriptionHistory).mockResolvedValue(mockHistory);

      await request(app)
        .get('/api/doctor/prescriptions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(doctorPrescriptionService.getPrescriptionHistory).toHaveBeenCalledWith('doctor123', 1, 10);
    });
  });
});