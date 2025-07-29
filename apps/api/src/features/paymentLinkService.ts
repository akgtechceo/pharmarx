import { firestore } from '../config/firebase';
import { PaymentLink, PaymentLinkRequest, PaymentLinkResponse, PrescriptionOrderStatus } from '@pharmarx/shared-types';
import { WhatsAppService } from './whatsappService';
import { SMSService } from './smsService';
import { randomBytes, createHash } from 'crypto';

export class PaymentLinkService {
  private whatsappService: WhatsAppService;
  private smsService: SMSService;
  private readonly baseUrl: string;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.smsService = new SMSService();
    this.baseUrl = process.env.PUBLIC_BASE_URL || 'https://pharmarx.com';
  }

  /**
   * Generate a secure payment link and store it in Firestore
   */
  async generatePaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    try {
      // Generate secure payment token
      const paymentToken = this.generateSecureToken();
      const linkId = this.generateLinkId();
      
      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const paymentLink: PaymentLink = {
        linkId,
        orderId: request.orderId,
        paymentToken,
        recipientPhone: request.recipientPhone,
        messageType: request.messageType,
        expiresAt,
        isUsed: false,
        createdAt: new Date()
      };

      // Store in Firestore
      await firestore.collection('paymentLinks').doc(linkId).set({
        ...paymentLink,
        expiresAt: firestore.Timestamp.fromDate(paymentLink.expiresAt),
        createdAt: firestore.Timestamp.fromDate(paymentLink.createdAt)
      });

      // Create public URL
      const publicUrl = `${this.baseUrl}/pay/${paymentToken}`;

      return {
        success: true,
        data: {
          linkId,
          paymentToken,
          publicUrl,
          expiresAt
        }
      };
    } catch (error) {
      console.error('Error generating payment link:', error);
      return {
        success: false,
        error: 'Failed to generate payment link'
      };
    }
  }

  /**
   * Send payment link message via WhatsApp or SMS
   */
  async sendPaymentLinkMessage(
    recipientPhone: string,
    messageType: 'whatsapp' | 'sms',
    publicUrl: string,
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get order details for message personalization
      const orderDetails = await this.getOrderDetailsForMessage(orderId);
      
      const message = this.generatePaymentMessage(publicUrl, orderDetails);

      if (messageType === 'whatsapp') {
        return await this.whatsappService.sendMessage(recipientPhone, message);
      } else {
        return await this.smsService.sendSMS(recipientPhone, message);
      }
    } catch (error) {
      console.error(`Error sending ${messageType} message:`, error);
      return {
        success: false,
        error: `Failed to send ${messageType} message`
      };
    }
  }

  /**
   * Verify that an order exists and belongs to the specified user
   */
  async verifyOrderOwnership(orderId: string, userId: string): Promise<boolean> {
    try {
      const orderDoc = await firestore.collection('prescriptionOrders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return false;
      }

      const orderData = orderDoc.data();
      return orderData?.patientProfileId === userId;
    } catch (error) {
      console.error('Error verifying order ownership:', error);
      return false;
    }
  }

  /**
   * Get the current status of an order
   */
  async getOrderStatus(orderId: string): Promise<PrescriptionOrderStatus | null> {
    try {
      const orderDoc = await firestore.collection('prescriptionOrders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return null;
      }

      return orderDoc.data()?.status || null;
    } catch (error) {
      console.error('Error getting order status:', error);
      return null;
    }
  }

  /**
   * Get all payment links for an order
   */
  async getPaymentLinksForOrder(orderId: string): Promise<PaymentLink[]> {
    try {
      const snapshot = await firestore
        .collection('paymentLinks')
        .where('orderId', '==', orderId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          expiresAt: data.expiresAt.toDate(),
          createdAt: data.createdAt.toDate()
        } as PaymentLink;
      });
    } catch (error) {
      console.error('Error fetching payment links:', error);
      return [];
    }
  }

  /**
   * Deactivate a payment link (mark as used)
   */
  async deactivatePaymentLink(linkId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const linkDoc = await firestore.collection('paymentLinks').doc(linkId).get();
      
      if (!linkDoc.exists) {
        return {
          success: false,
          error: 'Payment link not found'
        };
      }

      const linkData = linkDoc.data() as PaymentLink;
      
      // Verify the user owns the order associated with this payment link
      const hasAccess = await this.verifyOrderOwnership(linkData.orderId, userId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Mark as used
      await firestore.collection('paymentLinks').doc(linkId).update({
        isUsed: true,
        deactivatedAt: firestore.Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deactivating payment link:', error);
      return {
        success: false,
        error: 'Failed to deactivate payment link'
      };
    }
  }

  /**
   * Validate and get payment link by token
   */
  async getPaymentLinkByToken(paymentToken: string): Promise<PaymentLink | null> {
    try {
      const snapshot = await firestore
        .collection('paymentLinks')
        .where('paymentToken', '==', paymentToken)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        ...data,
        expiresAt: data.expiresAt.toDate(),
        createdAt: data.createdAt.toDate()
      } as PaymentLink;
    } catch (error) {
      console.error('Error getting payment link by token:', error);
      return null;
    }
  }

  /**
   * Mark a payment link as used after successful payment
   */
  async markPaymentLinkAsUsed(paymentToken: string): Promise<boolean> {
    try {
      const snapshot = await firestore
        .collection('paymentLinks')
        .where('paymentToken', '==', paymentToken)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const doc = snapshot.docs[0];
      await doc.ref.update({
        isUsed: true,
        usedAt: firestore.Timestamp.now()
      });

      return true;
    } catch (error) {
      console.error('Error marking payment link as used:', error);
      return false;
    }
  }

  /**
   * Clean up expired payment links (should be run periodically)
   */
  async cleanupExpiredLinks(): Promise<number> {
    try {
      const now = firestore.Timestamp.now();
      const snapshot = await firestore
        .collection('paymentLinks')
        .where('expiresAt', '<', now)
        .where('isUsed', '==', false)
        .get();

      const batch = firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up expired links:', error);
      return 0;
    }
  }

  /**
   * Generate a secure payment token
   */
  private generateSecureToken(): string {
    const randomData = randomBytes(32);
    const timestamp = Date.now().toString();
    const combined = randomData.toString('hex') + timestamp;
    
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Generate a unique link ID
   */
  private generateLinkId(): string {
    return 'link_' + randomBytes(16).toString('hex');
  }

  /**
   * Get order details for message personalization
   */
  private async getOrderDetailsForMessage(orderId: string): Promise<any> {
    try {
      const orderDoc = await firestore.collection('prescriptionOrders').doc(orderId).get();
      
      if (!orderDoc.exists) {
        return null;
      }

      const data = orderDoc.data();
      return {
        medicationName: data?.medicationDetails?.name || 'Medication',
        cost: data?.cost || 0,
        currency: 'USD' // Could be made configurable
      };
    } catch (error) {
      console.error('Error getting order details:', error);
      return null;
    }
  }

  /**
   * Generate personalized payment message
   */
  private generatePaymentMessage(publicUrl: string, orderDetails: any): string {
    const medicationName = orderDetails?.medicationName || 'Medication';
    const cost = orderDetails?.cost || 'the prescribed amount';
    
    return `Hi! Someone has requested that you help pay for their medication (${medicationName}) from PharmaRx. ` +
           `The cost is $${cost}. Please use this secure link to complete the payment: ${publicUrl} ` +
           `This link will expire in 48 hours. Thank you for your help! 💊`;
  }
}