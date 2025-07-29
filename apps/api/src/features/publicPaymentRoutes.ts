import { Router, Request, Response } from 'express';
import { validateRequest } from '../middleware/validation';
import { PaymentLinkService } from './paymentLinkService';
import { PublicPaymentInfo, PublicPaymentRequest, PublicPaymentResponse, PaymentLinkValidationResult } from '@pharmarx/shared-types';
import { param, body } from 'express-validator';
import { firestore } from '../config/firebase';

const router = Router();
const paymentLinkService = new PaymentLinkService();

// Validation middleware for payment token
const validatePaymentToken = [
  param('paymentToken')
    .isString()
    .isLength({ min: 10, max: 100 })
    .withMessage('Valid payment token is required'),
];

// Validation middleware for public payment request
const validatePublicPaymentRequest = [
  body('gateway')
    .isIn(['stripe', 'paypal', 'mtn'])
    .withMessage('Gateway must be stripe, paypal, or mtn'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('paymentData')
    .isObject()
    .withMessage('Payment data is required'),
];

/**
 * GET /public/pay/:paymentToken
 * Get minimal order details for public payment (no authentication required)
 */
router.get(
  '/public/pay/:paymentToken',
  validatePaymentToken,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentToken } = req.params;

      // Get payment link details
      const paymentLink = await paymentLinkService.getPaymentLinkByToken(paymentToken);
      
      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
        });
        return;
      }

      // Validate payment link
      const validation = validatePaymentLink(paymentLink);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid payment link',
        });
        return;
      }

      // Get minimal order information (only public data)
      const publicPaymentInfo = await getPublicPaymentInfo(paymentLink.orderId);
      
      if (!publicPaymentInfo) {
        res.status(404).json({
          success: false,
          error: 'Order information not available',
        });
        return;
      }

      res.json({
        success: true,
        data: publicPaymentInfo
      });
    } catch (error) {
      console.error('Error getting public payment info:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /public/pay/:paymentToken
 * Process payment from third party (no authentication required)
 */
router.post(
  '/public/pay/:paymentToken',
  validatePaymentToken,
  validatePublicPaymentRequest,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentToken } = req.params;
      const { gateway, amount, currency, paymentData }: PublicPaymentRequest = req.body;

      // Get and validate payment link
      const paymentLink = await paymentLinkService.getPaymentLinkByToken(paymentToken);
      
      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
        } as PublicPaymentResponse);
        return;
      }

      const validation = validatePaymentLink(paymentLink);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid payment link',
        } as PublicPaymentResponse);
        return;
      }

      // Get order details to verify amount
      const orderDoc = await firestore.collection('prescriptionOrders').doc(paymentLink.orderId).get();
      if (!orderDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Order not found',
        } as PublicPaymentResponse);
        return;
      }

      const orderData = orderDoc.data();
      const expectedAmount = orderData?.cost || 0;

      // Verify payment amount matches order cost
      if (Math.abs(amount - expectedAmount) > 0.01) {
        res.status(400).json({
          success: false,
          error: 'Payment amount does not match order cost',
        } as PublicPaymentResponse);
        return;
      }

      // Process payment using the existing payment service
      const paymentResult = await processThirdPartyPayment({
        orderId: paymentLink.orderId,
        gateway,
        amount,
        currency,
        paymentData,
        paymentToken
      });

      if (!paymentResult.success) {
        res.status(400).json(paymentResult);
        return;
      }

      // Mark payment link as used
      await paymentLinkService.markPaymentLinkAsUsed(paymentToken);

      // Update order status to paid
      await updateOrderStatus(paymentLink.orderId, 'preparing');

      // Send confirmation to original order owner
      await sendPaymentConfirmation(paymentLink.orderId, paymentResult.data!);

      res.status(201).json(paymentResult);
    } catch (error) {
      console.error('Error processing public payment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as PublicPaymentResponse);
    }
  }
);

/**
 * GET /public/pay/:paymentToken/status
 * Check payment link status (useful for frontend polling)
 */
router.get(
  '/public/pay/:paymentToken/status',
  validatePaymentToken,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentToken } = req.params;

      const paymentLink = await paymentLinkService.getPaymentLinkByToken(paymentToken);
      
      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
        });
        return;
      }

      const validation = validatePaymentLink(paymentLink);
      
      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          isExpired: validation.isExpired,
          isUsed: validation.isUsed,
          error: validation.error
        }
      });
    } catch (error) {
      console.error('Error checking payment link status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Validate payment link expiration and usage
 */
function validatePaymentLink(paymentLink: any): PaymentLinkValidationResult {
  const now = new Date();
  
  if (paymentLink.isUsed) {
    return {
      isValid: false,
      isExpired: false,
      isUsed: true,
      error: 'This payment link has already been used'
    };
  }
  
  if (paymentLink.expiresAt < now) {
    return {
      isValid: false,
      isExpired: true,
      isUsed: false,
      error: 'This payment link has expired'
    };
  }
  
  return {
    isValid: true,
    isExpired: false,
    isUsed: false
  };
}

/**
 * Get minimal public information about an order for payment
 */
async function getPublicPaymentInfo(orderId: string): Promise<PublicPaymentInfo | null> {
  try {
    const orderDoc = await firestore.collection('prescriptionOrders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return null;
    }

    const orderData = orderDoc.data();
    
    return {
      orderId,
      medicationName: orderData?.medicationDetails?.name || 'Prescription Medication',
      cost: orderData?.cost || 0,
      currency: 'USD', // Could be made configurable
      pharmacyName: 'PharmaRx Partner Pharmacy', // Could be made dynamic
      isValid: true,
      isExpired: false,
      isUsed: false
    };
  } catch (error) {
    console.error('Error getting public payment info:', error);
    return null;
  }
}

/**
 * Process third-party payment through payment gateways
 */
async function processThirdPartyPayment(request: {
  orderId: string;
  gateway: string;
  amount: number;
  currency: string;
  paymentData: any;
  paymentToken: string;
}): Promise<PublicPaymentResponse> {
  try {
    // This would integrate with the existing payment processing service
    // For now, we'll simulate payment processing
    
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store payment record
    await firestore.collection('payments').doc(paymentId).set({
      paymentId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      gateway: request.gateway,
      transactionId,
      status: 'succeeded',
      paymentToken: request.paymentToken,
      createdAt: firestore.Timestamp.now(),
      paidBy: 'third_party',
      receiptDetails: {
        // Receipt details would be generated here
        paymentMethod: request.gateway,
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      data: {
        paymentId,
        transactionId,
        receiptUrl: `/api/receipts/${paymentId}`
      }
    };
  } catch (error) {
    console.error('Error processing third-party payment:', error);
    return {
      success: false,
      error: 'Payment processing failed'
    };
  }
}

/**
 * Update order status after successful payment
 */
async function updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
  try {
    await firestore.collection('prescriptionOrders').doc(orderId).update({
      status: newStatus,
      paidAt: firestore.Timestamp.now(),
      updatedAt: firestore.Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Send payment confirmation to original order owner
 */
async function sendPaymentConfirmation(orderId: string, paymentData: any): Promise<void> {
  try {
    // This would integrate with notification service
    // For now, we'll just log the confirmation
    console.log(`Payment confirmation for order ${orderId}:`, paymentData);
    
    // Could send email, SMS, or push notification to the original order owner
    // Implementation would depend on available notification services
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    // Don't throw error as this is not critical for payment processing
  }
}

export default router;