import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrescriptionNotificationService } from './prescriptionNotificationService';
import { 
  DoctorPrescriptionSubmission, 
  PatientProfile, 
  PrescriptionNotification,
  NotificationPreferences 
} from '@pharmarx/shared-types';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn(),
          update: vi.fn(),
          get: vi.fn()
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn()
            }))
          }))
        }))
      })),
      batch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn()
      })),
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date }))
      }
    }))
  }
}));

// Mock SMS Service
vi.mock('./smsService', () => ({
  SMSService: vi.fn().mockImplementation(() => ({
    sendSMS: vi.fn()
  }))
}));

// Mock WhatsApp Service
vi.mock('./whatsappService', () => ({
  WhatsAppService: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn()
  }))
}));

describe('PrescriptionNotificationService', () => {
  let notificationService: PrescriptionNotificationService;
  let mockFirestore: any;
  let mockSMSService: any;
  let mockWhatsAppService: any;

  const mockPrescription: DoctorPrescriptionSubmission = {
    prescriptionId: 'prescription-123',
    doctorUid: 'doctor-456',
    patientProfileId: 'patient-789',
    medicationDetails: {
      name: 'Amoxicillin 500mg',
      dosage: '500mg, twice daily',
      quantity: 20,
      instructions: 'Take with food',
      refillsAuthorized: 2,
      refillsRemaining: 2
    },
    prescriptionNotes: 'Take as prescribed',
    submittedAt: new Date('2024-01-15T10:00:00Z'),
    status: 'submitted'
  };

  const mockPatientProfile: PatientProfile = {
    profileId: 'patient-789',
    managedByUid: 'user-123',
    patientName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'),
    notificationPreferences: {
      enableSMS: true,
      enableEmail: true,
      smsPhoneNumber: '+1234567890',
      emailAddress: 'john.doe@example.com'
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Firestore
    mockFirestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn(),
          update: vi.fn(),
          get: vi.fn()
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn()
            }))
          }))
        }))
      })),
      batch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn()
      })),
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date }))
      }
    };

    // Mock the firestore import
    vi.doMock('../config/firebase', () => ({
      firestore: mockFirestore
    }));

    notificationService = new PrescriptionNotificationService();
    
    // Get mocked services
    const { SMSService } = require('./smsService');
    const { WhatsAppService } = require('./whatsappService');
    mockSMSService = new SMSService();
    mockWhatsAppService = new WhatsAppService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('notifyPatientOfPrescription', () => {
    it('should send SMS and email notifications when both are enabled', async () => {
      // Mock successful SMS sending
      mockSMSService.sendSMS.mockResolvedValue({ success: true });
      
      // Mock successful batch commit
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.batch.mockReturnValue(mockBatch);

      const result = await notificationService.notifyPatientOfPrescription(
        mockPrescription,
        mockPatientProfile
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].notificationType).toBe('sms');
      expect(result.notifications[1].notificationType).toBe('email');
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining('Amoxicillin 500mg')
      );
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should only send SMS notification when email is disabled', async () => {
      const profileWithSMSOnly = {
        ...mockPatientProfile,
        notificationPreferences: {
          enableSMS: true,
          enableEmail: false,
          smsPhoneNumber: '+1234567890'
        }
      };

      mockSMSService.sendSMS.mockResolvedValue({ success: true });
      
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.batch.mockReturnValue(mockBatch);

      const result = await notificationService.notifyPatientOfPrescription(
        mockPrescription,
        profileWithSMSOnly
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].notificationType).toBe('sms');
      expect(mockSMSService.sendSMS).toHaveBeenCalledTimes(1);
    });

    it('should handle SMS sending failure gracefully', async () => {
      mockSMSService.sendSMS.mockResolvedValue({ 
        success: false, 
        error: 'Invalid phone number' 
      });
      
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.batch.mockReturnValue(mockBatch);

      const result = await notificationService.notifyPatientOfPrescription(
        mockPrescription,
        mockPatientProfile
      );

      expect(result.success).toBe(true); // Email still succeeds
      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].status).toBe('failed');
      expect(result.notifications[0].errorMessage).toBe('Invalid phone number');
      expect(result.notifications[1].status).toBe('sent');
    });

    it('should handle missing notification preferences', async () => {
      const profileWithoutPreferences = {
        ...mockPatientProfile,
        notificationPreferences: undefined
      };

      const result = await notificationService.notifyPatientOfPrescription(
        mockPrescription,
        profileWithoutPreferences
      );

      expect(result.success).toBe(false);
      expect(result.notifications).toHaveLength(0);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history for a patient', async () => {
      const mockNotifications = [
        {
          notificationId: 'notif-1',
          patientProfileId: 'patient-789',
          prescriptionId: 'prescription-123',
          notificationType: 'sms',
          status: 'sent',
          sentAt: { toDate: () => new Date('2024-01-15T10:00:00Z') }
        }
      ];

      const mockSnapshot = {
        docs: mockNotifications.map(notif => ({
          data: () => notif
        }))
      };

      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockSnapshot)
      };

      mockFirestore.collection.mockReturnValue(mockQuery);

      const result = await notificationService.getNotificationHistory('patient-789', 10);

      expect(result).toHaveLength(1);
      expect(result[0].notificationId).toBe('notif-1');
      expect(result[0].status).toBe('sent');
    });

    it('should handle errors gracefully', async () => {
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await notificationService.getNotificationHistory('patient-789', 10);

      expect(result).toEqual([]);
    });
  });

  describe('updateNotificationStatus', () => {
    it('should update notification status successfully', async () => {
      const mockDoc = {
        update: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc)
      });

      const result = await notificationService.updateNotificationStatus(
        'notif-123',
        'delivered'
      );

      expect(result).toBe(true);
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'delivered',
          deliveredAt: expect.any(Object)
        })
      );
    });

    it('should handle update errors', async () => {
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const result = await notificationService.updateNotificationStatus(
        'notif-123',
        'delivered'
      );

      expect(result).toBe(false);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences successfully', async () => {
      const mockDoc = {
        update: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDoc)
      });

      const preferences: NotificationPreferences = {
        enableSMS: true,
        enableEmail: false,
        smsPhoneNumber: '+1234567890'
      };

      const result = await notificationService.updateNotificationPreferences(
        'patient-789',
        preferences
      );

      expect(result).toBe(true);
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationPreferences: preferences,
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should handle update errors', async () => {
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const preferences: NotificationPreferences = {
        enableSMS: true,
        enableEmail: false
      };

      const result = await notificationService.updateNotificationPreferences(
        'patient-789',
        preferences
      );

      expect(result).toBe(false);
    });
  });
});