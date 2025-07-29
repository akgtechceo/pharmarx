import { firestore } from '../config/firebase';
import { 
  PrescriptionNotification, 
  DoctorPrescriptionSubmission, 
  PatientProfile,
  NotificationPreferences 
} from '@pharmarx/shared-types';
import { SMSService } from './smsService';
import { WhatsAppService } from './whatsappService';

export class PrescriptionNotificationService {
  private smsService: SMSService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.smsService = new SMSService();
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Send notification to patient when prescription is submitted
   */
  async notifyPatientOfPrescription(
    prescription: DoctorPrescriptionSubmission,
    patientProfile: PatientProfile
  ): Promise<{ success: boolean; notifications: PrescriptionNotification[]; error?: string }> {
    try {
      const notifications: PrescriptionNotification[] = [];
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get patient's notification preferences
      const preferences = patientProfile.notificationPreferences || {
        enableSMS: false,
        enableEmail: false
      };

      // Send SMS notification if enabled
      if (preferences.enableSMS && preferences.smsPhoneNumber) {
        const smsNotification = await this.sendSMSNotification(
          notificationId,
          prescription,
          patientProfile,
          preferences.smsPhoneNumber
        );
        notifications.push(smsNotification);
      }

      // Send email notification if enabled
      if (preferences.enableEmail && preferences.emailAddress) {
        const emailNotification = await this.sendEmailNotification(
          notificationId,
          prescription,
          patientProfile,
          preferences.emailAddress
        );
        notifications.push(emailNotification);
      }

      // Save notifications to Firestore
      await this.saveNotifications(notifications);

      return {
        success: notifications.some(n => n.status === 'sent'),
        notifications
      };

    } catch (error) {
      console.error('Error sending prescription notifications:', error);
      return {
        success: false,
        notifications: [],
        error: 'Failed to send notifications'
      };
    }
  }

  /**
   * Send SMS notification for prescription submission
   */
  private async sendSMSNotification(
    notificationId: string,
    prescription: DoctorPrescriptionSubmission,
    patientProfile: PatientProfile,
    phoneNumber: string
  ): Promise<PrescriptionNotification> {
    const notification: PrescriptionNotification = {
      notificationId: `${notificationId}_sms`,
      patientProfileId: patientProfile.profileId,
      prescriptionId: prescription.prescriptionId,
      notificationType: 'sms',
      status: 'pending',
      sentAt: new Date()
    };

    try {
      const message = this.formatPrescriptionSMSMessage(prescription, patientProfile);
      const result = await this.smsService.sendSMS(phoneNumber, message);

      if (result.success) {
        notification.status = 'sent';
      } else {
        notification.status = 'failed';
        notification.errorMessage = result.error;
      }

    } catch (error) {
      notification.status = 'failed';
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return notification;
  }

  /**
   * Send email notification for prescription submission
   */
  private async sendEmailNotification(
    notificationId: string,
    prescription: DoctorPrescriptionSubmission,
    patientProfile: PatientProfile,
    emailAddress: string
  ): Promise<PrescriptionNotification> {
    const notification: PrescriptionNotification = {
      notificationId: `${notificationId}_email`,
      patientProfileId: patientProfile.profileId,
      prescriptionId: prescription.prescriptionId,
      notificationType: 'email',
      status: 'pending',
      sentAt: new Date()
    };

    try {
      // For now, we'll simulate email sending
      // In production, this would integrate with an email service like SendGrid or AWS SES
      const emailContent = this.formatPrescriptionEmailMessage(prescription, patientProfile);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate successful email sending
      notification.status = 'sent';
      
      console.log('Email notification would be sent:', {
        to: emailAddress,
        subject: 'New Prescription Available - PharmaRx',
        content: emailContent
      });

    } catch (error) {
      notification.status = 'failed';
      notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return notification;
  }

  /**
   * Format SMS message for prescription notification
   */
  private formatPrescriptionSMSMessage(
    prescription: DoctorPrescriptionSubmission,
    patientProfile: PatientProfile
  ): string {
    const medicationName = prescription.medicationDetails.name;
    const dosage = prescription.medicationDetails.dosage;
    const quantity = prescription.medicationDetails.quantity;
    const refills = prescription.medicationDetails.refillsAuthorized;

    return `PharmaRx: New prescription available for ${patientProfile.patientName}.\n\n` +
           `Medication: ${medicationName}\n` +
           `Dosage: ${dosage}\n` +
           `Quantity: ${quantity}\n` +
           `Refills: ${refills}\n\n` +
           `Your prescription is ready for pickup. Visit your nearest pharmacy or contact us for delivery options.`;
  }

  /**
   * Format email message for prescription notification
   */
  private formatPrescriptionEmailMessage(
    prescription: DoctorPrescriptionSubmission,
    patientProfile: PatientProfile
  ): string {
    const medicationName = prescription.medicationDetails.name;
    const dosage = prescription.medicationDetails.dosage;
    const quantity = prescription.medicationDetails.quantity;
    const instructions = prescription.medicationDetails.instructions;
    const refills = prescription.medicationDetails.refillsAuthorized;
    const notes = prescription.prescriptionNotes;

    return `
      <html>
        <body>
          <h2>New Prescription Available</h2>
          <p>Dear ${patientProfile.patientName},</p>
          
          <p>A new prescription has been submitted by your doctor and is now available for pickup.</p>
          
          <h3>Prescription Details:</h3>
          <ul>
            <li><strong>Medication:</strong> ${medicationName}</li>
            <li><strong>Dosage:</strong> ${dosage}</li>
            <li><strong>Quantity:</strong> ${quantity}</li>
            <li><strong>Instructions:</strong> ${instructions}</li>
            <li><strong>Refills Authorized:</strong> ${refills}</li>
          </ul>
          
          ${notes ? `<h3>Additional Notes:</h3><p>${notes}</p>` : ''}
          
          <p>Your prescription is ready for pickup at your nearest pharmacy. You can also contact us for delivery options.</p>
          
          <p>Thank you for choosing PharmaRx!</p>
        </body>
      </html>
    `;
  }

  /**
   * Save notifications to Firestore
   */
  private async saveNotifications(notifications: PrescriptionNotification[]): Promise<void> {
    const batch = firestore.batch();
    
    for (const notification of notifications) {
      const notificationRef = firestore.collection('prescriptionNotifications').doc(notification.notificationId);
      batch.set(notificationRef, {
        ...notification,
        sentAt: firestore.Timestamp.fromDate(notification.sentAt || new Date()),
        deliveredAt: notification.deliveredAt ? firestore.Timestamp.fromDate(notification.deliveredAt) : null
      });
    }

    await batch.commit();
  }

  /**
   * Get notification history for a patient
   */
  async getNotificationHistory(
    patientProfileId: string,
    limit: number = 50
  ): Promise<PrescriptionNotification[]> {
    try {
      const snapshot = await firestore
        .collection('prescriptionNotifications')
        .where('patientProfileId', '==', patientProfileId)
        .orderBy('sentAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          sentAt: data.sentAt?.toDate(),
          deliveredAt: data.deliveredAt?.toDate()
        } as PrescriptionNotification;
      });

    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  /**
   * Update notification delivery status
   */
  async updateNotificationStatus(
    notificationId: string,
    status: 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const notificationRef = firestore.collection('prescriptionNotifications').doc(notificationId);
      
      const updateData: any = {
        status,
        deliveredAt: status === 'delivered' ? firestore.Timestamp.fromDate(new Date()) : null
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await notificationRef.update(updateData);
      return true;

    } catch (error) {
      console.error('Error updating notification status:', error);
      return false;
    }
  }

  /**
   * Update patient notification preferences
   */
  async updateNotificationPreferences(
    patientProfileId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      const profileRef = firestore.collection('patientProfiles').doc(patientProfileId);
      
      await profileRef.update({
        notificationPreferences: preferences,
        updatedAt: firestore.Timestamp.fromDate(new Date())
      });

      return true;

    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}