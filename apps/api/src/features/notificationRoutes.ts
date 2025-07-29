import express from 'express';
import { PrescriptionNotificationService } from './prescriptionNotificationService';
import { verifyAuth } from '../middleware/auth';
import { verifyPatientRole } from '../middleware/roleVerification';
import { 
  ApiResponse, 
  NotificationPreferences, 
  UpdateNotificationPreferencesRequest,
  PrescriptionNotification 
} from '@pharmarx/shared-types';

const router = express.Router();
const notificationService = new PrescriptionNotificationService();

/**
 * GET /notifications/preferences/:patientProfileId
 * Get notification preferences for a patient profile
 */
router.get('/preferences/:patientProfileId', verifyAuth, verifyPatientRole, async (req, res) => {
  try {
    const { patientProfileId } = req.params;
    const userUid = req.user?.uid;

    if (!userUid) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // In a real implementation, you would verify that the user has access to this patient profile
    // For now, we'll assume the user has access if they're authenticated

    // Get patient profile to retrieve notification preferences
    const { firestore } = require('firebase-admin');
    const db = firestore();
    const profileDoc = await db.collection('patientProfiles').doc(patientProfileId).get();

    if (!profileDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found'
      });
    }

    const profileData = profileDoc.data();
    const preferences: NotificationPreferences = profileData.notificationPreferences || {
      enableSMS: false,
      enableEmail: false
    };

    const response: ApiResponse<NotificationPreferences> = {
      success: true,
      data: preferences,
      message: 'Notification preferences retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences'
    });
  }
});

/**
 * PUT /notifications/preferences/:patientProfileId
 * Update notification preferences for a patient profile
 */
router.put('/preferences/:patientProfileId', verifyAuth, verifyPatientRole, async (req, res) => {
  try {
    const { patientProfileId } = req.params;
    const updateData: UpdateNotificationPreferencesRequest = req.body;
    const userUid = req.user?.uid;

    if (!userUid) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate input
    if (updateData.enableSMS && !updateData.smsPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'SMS phone number is required when SMS notifications are enabled'
      });
    }

    if (updateData.enableEmail && !updateData.emailAddress) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required when email notifications are enabled'
      });
    }

    // Get current preferences
    const { firestore } = require('firebase-admin');
    const db = firestore();
    const profileDoc = await db.collection('patientProfiles').doc(patientProfileId).get();

    if (!profileDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Patient profile not found'
      });
    }

    const profileData = profileDoc.data();
    const currentPreferences: NotificationPreferences = profileData.notificationPreferences || {
      enableSMS: false,
      enableEmail: false
    };

    // Merge with new preferences
    const updatedPreferences: NotificationPreferences = {
      ...currentPreferences,
      ...updateData
    };

    // Update preferences
    const success = await notificationService.updateNotificationPreferences(
      patientProfileId,
      updatedPreferences
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences'
      });
    }

    const response: ApiResponse<NotificationPreferences> = {
      success: true,
      data: updatedPreferences,
      message: 'Notification preferences updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

/**
 * GET /notifications/history/:patientProfileId
 * Get notification history for a patient profile
 */
router.get('/history/:patientProfileId', verifyAuth, verifyPatientRole, async (req, res) => {
  try {
    const { patientProfileId } = req.params;
    const { limit = 50 } = req.query;
    const userUid = req.user?.uid;

    if (!userUid) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter (must be between 1 and 100)'
      });
    }

    const notifications = await notificationService.getNotificationHistory(
      patientProfileId,
      limitNum
    );

    const response: ApiResponse<PrescriptionNotification[]> = {
      success: true,
      data: notifications,
      message: 'Notification history retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
});

/**
 * POST /notifications/:notificationId/status
 * Update notification delivery status (for webhooks from SMS/email providers)
 */
router.post('/:notificationId/status', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { status, errorMessage } = req.body;

    if (!status || !['delivered', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "delivered" or "failed"'
      });
    }

    const success = await notificationService.updateNotificationStatus(
      notificationId,
      status,
      errorMessage
    );

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update notification status'
      });
    }

    const response: ApiResponse<{ notificationId: string; status: string }> = {
      success: true,
      data: { notificationId, status },
      message: 'Notification status updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification status'
    });
  }
});

export default router;