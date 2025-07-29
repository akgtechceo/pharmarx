import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { PaymentLinkService } from './paymentLinkService';
import { PaymentLinkRequest, PaymentLinkResponse, ApiResponse } from '@pharmarx/shared-types';
import { body, param } from 'express-validator';

const router = Router();
const paymentLinkService = new PaymentLinkService();

// Validation middleware for payment link request
const validatePaymentLinkRequest = [
  param('orderId')
    .isString()
    .notEmpty()
    .withMessage('Order ID is required'),
  body('recipientPhone')
    .isString()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Valid international phone number is required (E.164 format)'),
  body('messageType')
    .isIn(['whatsapp', 'sms'])
    .withMessage('Message type must be either "whatsapp" or "sms"'),
];

/**
 * POST /orders/:orderId/request-payment
 * Generate and send a payment link to a third party
 */
router.post(
  '/orders/:orderId/request-payment',
  authenticateToken,
  validatePaymentLinkRequest,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { recipientPhone, messageType }: PaymentLinkRequest = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        } as PaymentLinkResponse);
        return;
      }

      // Verify order exists and belongs to user
      const orderExists = await paymentLinkService.verifyOrderOwnership(orderId, userId);
      if (!orderExists) {
        res.status(404).json({
          success: false,
          error: 'Order not found or access denied'
        } as PaymentLinkResponse);
        return;
      }

      // Check if order is in awaiting_payment status
      const orderStatus = await paymentLinkService.getOrderStatus(orderId);
      if (orderStatus !== 'awaiting_payment') {
        res.status(400).json({
          success: false,
          error: 'Order must be in awaiting_payment status to request payment from third party'
        } as PaymentLinkResponse);
        return;
      }

      // Generate payment link
      const result = await paymentLinkService.generatePaymentLink({
        orderId,
        recipientPhone,
        messageType
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Send message to recipient
      const messageResult = await paymentLinkService.sendPaymentLinkMessage(
        recipientPhone,
        messageType,
        result.data!.publicUrl,
        orderId
      );

      if (!messageResult.success) {
        // Payment link was created but message failed to send
        res.status(207).json({
          success: true,
          data: result.data,
          error: `Payment link created but failed to send ${messageType}: ${messageResult.error}`
        } as PaymentLinkResponse);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error generating payment link:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as PaymentLinkResponse);
    }
  }
);

/**
 * GET /orders/:orderId/payment-links
 * Get payment links for an order (for order owner only)
 */
router.get(
  '/orders/:orderId/payment-links',
  authenticateToken,
  [param('orderId').isString().notEmpty().withMessage('Order ID is required')],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      // Verify order belongs to user
      const orderExists = await paymentLinkService.verifyOrderOwnership(orderId, userId);
      if (!orderExists) {
        res.status(404).json({
          success: false,
          error: 'Order not found or access denied'
        });
        return;
      }

      const paymentLinks = await paymentLinkService.getPaymentLinksForOrder(orderId);
      
      res.json({
        success: true,
        data: paymentLinks
      });
    } catch (error) {
      console.error('Error fetching payment links:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /payment-links/:linkId
 * Deactivate a payment link (for order owner only)
 */
router.delete(
  '/payment-links/:linkId',
  authenticateToken,
  [param('linkId').isString().notEmpty().withMessage('Link ID is required')],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { linkId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const result = await paymentLinkService.deactivatePaymentLink(linkId, userId);
      
      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 403;
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error deactivating payment link:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;