import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DoctorPrescriptionService } from './doctorPrescriptionService';
import { db } from './database';
import { 
  PatientSearchRequest, 
  CreateDoctorPrescriptionInput,
  UserRole,
  PrescriptionOrderStatus
} from '@pharmarx/shared-types';

// Mock the database
vi.mock('./database', () => ({
  db: {
    collection: vi.fn()
  }
}));

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date }))
      }
    }
  }
}));

describe('DoctorPrescriptionService', () => {
  let service: DoctorPrescriptionService;
  let mockCollection: any;
  let mockDoc: any;

  beforeEach(() => {
    service = new DoctorPrescriptionService();
    mockDoc = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined)
    };
    mockCollection = {
      doc: vi.fn(() => mockDoc),
      where: vi.fn(() => mockCollection),
      orderBy: vi.fn(() => mockCollection),
      limit: vi.fn(() => mockCollection),
      offset: vi.fn(() => mockCollection),
      get: vi.fn()
    };
    (db.collection as any).mockReturnValue(mockCollection);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPatients', () => {
    it('should return empty array for empty query', async () => {
      const request: PatientSearchRequest = {
        query: '',
        searchType: 'all'
      };

      const result = await service.searchPatients(request);
      expect(result).toEqual([]);
    });

    it('should search by name', async () => {
      const request: PatientSearchRequest = {
        query: 'John Doe',
        searchType: 'name',
        limit: 5
      };

      const mockDocs = [
        {
          id: 'profile1',
          data: () => ({
            patientName: 'John Doe',
            dateOfBirth: { toDate: () => new Date('1990-01-01') },
            managedByUid: 'user1',
            insuranceDetails: { provider: 'Blue Cross', policyNumber: '12345' }
          })
        }
      ];

      const mockUserDoc = {
        exists: true,
        data: () => ({
          phoneNumber: '+1234567890',
          email: 'john@example.com'
        })
      };

      const mockPrescriptionQuery = {
        docs: []
      };

      mockCollection.get.mockResolvedValue({ docs: mockDocs });
      mockDoc.get.mockResolvedValue(mockUserDoc);

      // Mock different collections for the complex search
      (db.collection as any).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue(mockUserDoc)
            }))
          };
        }
        if (collectionName === 'prescriptionOrders') {
          return {
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue(mockPrescriptionQuery)
          };
        }
        return mockCollection;
      });

      const result = await service.searchPatients(request);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        profileId: 'profile1',
        patientName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        insuranceDetails: { provider: 'Blue Cross', policyNumber: '12345' },
        lastPrescriptionDate: undefined
      });
    });

    it('should search by phone number', async () => {
      const request: PatientSearchRequest = {
        query: '+1234567890',
        searchType: 'phone'
      };

      const mockUserDocs = [
        {
          id: 'user1',
          data: () => ({
            phoneNumber: '+1234567890',
            email: 'john@example.com'
          })
        }
      ];

      const mockProfileDocs = [
        {
          id: 'profile1',
          data: () => ({
            patientName: 'John Doe',
            dateOfBirth: { toDate: () => new Date('1990-01-01') },
            managedByUid: 'user1',
            insuranceDetails: { provider: 'Blue Cross', policyNumber: '12345' }
          })
        }
      ];

      const mockUserDoc = {
        exists: true,
        data: () => ({
          phoneNumber: '+1234567890',
          email: 'john@example.com'
        })
      };

      const mockPrescriptionQuery = {
        docs: []
      };

      // Mock different collections
      (db.collection as any).mockImplementation((collectionName) => {
        if (collectionName === 'users') {
          return {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ docs: mockUserDocs }),
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue(mockUserDoc)
            }))
          };
        }
        if (collectionName === 'patientProfiles') {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ docs: mockProfileDocs })
          };
        }
        if (collectionName === 'prescriptionOrders') {
          return {
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue(mockPrescriptionQuery)
          };
        }
        return mockCollection;
      });

      const result = await service.searchPatients(request);

      expect(result).toHaveLength(1);
      expect(result[0].patientName).toBe('John Doe');
    });

    it('should handle search errors gracefully', async () => {
      const request: PatientSearchRequest = {
        query: 'test',
        searchType: 'name'
      };

      mockCollection.where.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.searchPatients(request)).rejects.toThrow('Failed to search patients');
    });
  });

  describe('submitPrescription', () => {
    it('should submit prescription successfully', async () => {
      const doctorUid = 'doctor123';
      const input: CreateDoctorPrescriptionInput = {
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

      const mockPatientProfile = {
        exists: true,
        data: () => ({
          patientName: 'John Doe',
          dateOfBirth: new Date('1990-01-01')
        })
      };

      mockDoc.get.mockResolvedValue(mockPatientProfile);

      const result = await service.submitPrescription(doctorUid, input);

      expect(result).toMatchObject({
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
        status: 'submitted'
      });
      expect(result.prescriptionId).toBeDefined();
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent patient profile', async () => {
      const doctorUid = 'doctor123';
      const input: CreateDoctorPrescriptionInput = {
        patientProfileId: 'nonexistent',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 0
        }
      };

      const mockPatientProfile = {
        exists: false
      };

      mockDoc.get.mockResolvedValue(mockPatientProfile);

      await expect(service.submitPrescription(doctorUid, input)).rejects.toThrow('Patient profile not found');
    });

    it('should create prescription order for pharmacist processing', async () => {
      const doctorUid = 'doctor123';
      const input: CreateDoctorPrescriptionInput = {
        patientProfileId: 'patient123',
        medicationDetails: {
          name: 'Aspirin',
          dosage: '100mg',
          quantity: 30,
          instructions: 'Take 1 tablet daily',
          refillsAuthorized: 1
        }
      };

      const mockPatientProfile = {
        exists: true,
        data: () => ({
          patientName: 'John Doe',
          dateOfBirth: new Date('1990-01-01')
        })
      };

      mockDoc.get.mockResolvedValue(mockPatientProfile);

      await service.submitPrescription(doctorUid, input);

      // Verify that prescription order was created
      expect(mockCollection.doc).toHaveBeenCalledTimes(2); // Once for prescription, once for order
      expect(mockDoc.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPrescriptionHistory', () => {
    it('should return prescription history with pagination', async () => {
      const doctorUid = 'doctor123';
      const page = 1;
      const limit = 5;

      const mockPrescriptionDocs = [
        {
          data: () => ({
            prescriptionId: 'prescription1',
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
            submittedAt: { toDate: () => new Date('2024-01-01') },
            status: 'submitted'
          })
        }
      ];

      const mockTotalQuery = {
        size: 1
      };

      mockCollection.get.mockResolvedValueOnce({ docs: mockPrescriptionDocs });
      mockCollection.get.mockResolvedValueOnce(mockTotalQuery);

      const result = await service.getPrescriptionHistory(doctorUid, page, limit);

      expect(result).toEqual({
        prescriptions: [
          {
            prescriptionId: 'prescription1',
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
          limit: 5,
          total: 1,
          hasMore: false
        }
      });
    });

    it('should handle empty prescription history', async () => {
      const doctorUid = 'doctor123';
      const page = 1;
      const limit = 10;

      const mockTotalQuery = {
        size: 0
      };

      mockCollection.get.mockResolvedValueOnce({ docs: [] });
      mockCollection.get.mockResolvedValueOnce(mockTotalQuery);

      const result = await service.getPrescriptionHistory(doctorUid, page, limit);

      expect(result.prescriptions).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle database errors', async () => {
      const doctorUid = 'doctor123';
      const page = 1;
      const limit = 10;

      mockCollection.where.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getPrescriptionHistory(doctorUid, page, limit)).rejects.toThrow('Failed to get prescription history');
    });
  });
});