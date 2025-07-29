import request from 'supertest';
import express from 'express';
import notificationRoutes from './notificationRoutes';
import { PrescriptionNotificationService } from './prescriptionNotificationService';
import { NotificationPreferences } from '@pharmarx/shared-types';

// Mock the notification service
vi.mock('./prescriptionNotificationService');
const MockPrescriptionNotificationService = vi.mocked(PrescriptionNotificationService);

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock middleware
vi.mock('../middleware/auth', () => ({
  verifyAuth: vi.fn((req, res, next) => {
    req.user = { uid: 'test-user-123' };
    next();
  })
}));

vi.mock('../middleware/roleVerification', () => ({
  verifyPatientRole: vi.fn((req, res, next) => {
    next();
  })
}));

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification Routes', () => {
  let mockNotificationService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock notification service instance
    mockNotificationService = {
      getNotificationHistory: vi.fn(),
      updateNotificationPreferences: vi.fn(),
      updateNotificationStatus: vi.fn()
    };

    // Mock the constructor to return our mock instance
    MockPrescriptionNotificationService.mockImplementation(() => mockNotificationService);
  });

  describe('GET /api/notifications/preferences/:patientProfileId', () => {
    it('should return notification preferences for a patient profile', async () => {
      // Mock Firestore response
      const mockFirestore = require('firebase-admin').default.firestore();
      const mockDoc = {
        exists: true,
        data: () => ({
          notificationPreferences: {
            enableSMS: true,
            enableEmail: false,
            smsPhoneNumber: '+1234567890'
          }
        })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const response = await request(app)
        .get('/api/notifications/preferences/patient-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        enableSMS: true,
        enableEmail: false,
        smsPhoneNumber: '+1234567890'
      });
    });

    it('should return default preferences when none exist', async () => {
      const mockFirestore = require('firebase-admin').default.firestore();
      const mockDoc = {
        exists: true,
        data: () => ({})
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const response = await request(app)
        .get('/api/notifications/preferences/patient-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        enableSMS: false,
        enableEmail: false
      });
    });

    it('should return 404 when patient profile not found', async () => {
      const mockFirestore = require('firebase-admin').default.firestore();
      const mockDoc = {
        exists: false
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      const response = await request(app)
        .get('/api/notifications/preferences/nonexistent-patient')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Patient profile not found');
    });
  });

  describe('PUT /api/notifications/preferences/:patientProfileId', () => {
    it('should update notification preferences successfully', async () => {
      const mockFirestore = require('firebase-admin').default.firestore();
      const mockDoc = {
        exists: true,
        data: () => ({
          notificationPreferences: {
            enableSMS: false,
            enableEmail: false
          }
        })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(true);

      const updateData: Partial<NotificationPreferences> = {
        enableSMS: true,
        smsPhoneNumber: '+1234567890'
      };

      const response = await request(app)
        .put('/api/notifications/preferences/patient-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        enableSMS: true,
        enableEmail: false,
        smsPhoneNumber: '+1234567890'
      });
      expect(mockNotificationService.updateNotificationPreferences).toHaveBeenCalledWith(
        'patient-123',
        expect.objectContaining({
          enableSMS: true,
          enableEmail: false,
          smsPhoneNumber: '+1234567890'
        })
      );
    });

    it('should validate SMS phone number when SMS is enabled', async () => {
      const updateData = {
        enableSMS: true
        // Missing smsPhoneNumber
      };

      const response = await request(app)
        .put('/api/notifications/preferences/patient-123')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('SMS phone number is required when SMS notifications are enabled');
    });

    it('should validate email address when email is enabled', async () => {
      const updateData = {
        enableEmail: true
        // Missing emailAddress
      };

      const response = await request(app)
        .put('/api/notifications/preferences/patient-123')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email address is required when email notifications are enabled');
    });

    it('should handle service errors', async () => {
      const mockFirestore = require('firebase-admin').default.firestore();
      const mockDoc = {
        exists: true,
        data: () => ({
          notificationPreferences: {
            enableSMS: false,
            enableEmail: false
          }
        })
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(false);

      const updateData = {
        enableSMS: true,
        smsPhoneNumber: '+1234567890'
      };

      const response = await request(app)
        .put('/api/notifications/preferences/patient-123')
        .send(updateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update notification preferences');
    });
  });

  describe('GET /api/notifications/history/:patientProfileId', () => {
    it('should return notification history', async () => {
      const mockNotifications = [
        {
          notificationId: 'notif-1',
          patientProfileId: 'patient-123',
          prescriptionId: 'prescription-456',
          notificationType: 'sms',
          status: 'sent',
          sentAt: new Date('2024-01-15T10:00:00Z')
        }
      ];

      mockNotificationService.getNotificationHistory.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/api/notifications/history/patient-123?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNotifications);
      expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith('patient-123', 10);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/notifications/history/patient-123?limit=150')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid limit parameter (must be between 1 and 100)');
    });

    it('should use default limit when not provided', async () => {
      mockNotificationService.getNotificationHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/notifications/history/patient-123')
        .expect(200);

      expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith('patient-123', 50);
    });
  });

  describe('POST /api/notifications/:notificationId/status', () => {
    it('should update notification status successfully', async () => {
      mockNotificationService.updateNotificationStatus.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/notifications/notif-123/status')
        .send({
          status: 'delivered'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        notificationId: 'notif-123',
        status: 'delivered'
      });
      expect(mockNotificationService.updateNotificationStatus).toHaveBeenCalledWith(
        'notif-123',
        'delivered',
        undefined
      );
    });

    it('should validate status parameter', async () => {
      const response = await request(app)
        .post('/api/notifications/notif-123/status')
        .send({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status. Must be "delivered" or "failed"');
    });

    it('should handle missing status parameter', async () => {
      const response = await request(app)
        .post('/api/notifications/notif-123/status')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status. Must be "delivered" or "failed"');
    });

    it('should handle service errors', async () => {
      mockNotificationService.updateNotificationStatus.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/notifications/notif-123/status')
        .send({
          status: 'delivered'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update notification status');
    });

    it('should include error message when provided', async () => {
      mockNotificationService.updateNotificationStatus.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/notifications/notif-123/status')
        .send({
          status: 'failed',
          errorMessage: 'Message delivery failed'
        })
        .expect(200);

      expect(mockNotificationService.updateNotificationStatus).toHaveBeenCalledWith(
        'notif-123',
        'failed',
        'Message delivery failed'
      );
    });
  });
});