import { Request, Response, Router } from 'express';
import { ApiResponse } from '@pharmarx/shared-types';
import { paymentService, ProcessPaymentRequest, ProcessPaymentResult } from './paymentService';
import { receiptService } from './receiptService';
import admin from 'firebase-admin';

const router = Router();

/**
 * Middleware to authenticate user
 */
const authenticateUser = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      } as ApiResponse<null>);
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization token'
    } as ApiResponse<null>);
  }
};

/**
 * POST /orders/:orderId/pay - Process payment for an order
 */
router.post('/orders/:orderId/pay', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { gateway, amount, currency, paymentData } = req.body;

    // Validate required fields
    if (!gateway) {
      return res.status(400).json({
        success: false,
        error: 'Payment gateway is required'
      } as ApiResponse<null>);
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      } as ApiResponse<null>);
    }

    if (!currency) {
      return res.status(400).json({
        success: false,
        error: 'Currency is required'
      } as ApiResponse<null>);
    }

    // Create payment request
    const paymentRequest: ProcessPaymentRequest = {
      orderId,
      gateway,
      amount: parseFloat(amount),
      currency,
      paymentData: paymentData || {}
    };

    // Process payment
    const result = await paymentService.processPayment(paymentRequest, req.user?.uid);

    res.status(200).json({
      success: true,
      data: {
        paymentId: result.paymentId,
        transactionId: result.transactionId,
        status: result.status
      },
      message: 'Payment processed successfully'
    } as ApiResponse<{
      paymentId: string;
      transactionId: string;
      status: string;
    }>);

  } catch (error) {
    console.error('Payment processing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
    const statusCode = errorMessage.includes('validation failed') || 
                      errorMessage.includes('not found') || 
                      errorMessage.includes('not ready') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId/payments - Get payment history for an order
 */
router.get('/orders/:orderId/payments', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const payments = await paymentService.getPaymentsForOrder(orderId);

    res.status(200).json({
      success: true,
      data: payments,
      message: 'Payment history retrieved successfully'
    } as ApiResponse<typeof payments>);

  } catch (error) {
    console.error('Error fetching payment history:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history'
    } as ApiResponse<null>);
  }
});

/**
 * GET /payments/:paymentId - Get payment details by ID
 */
router.get('/payments/:paymentId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentService.getPayment(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment details retrieved successfully'
    } as ApiResponse<typeof payment>);

  } catch (error) {
    console.error('Error fetching payment details:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment details'
    } as ApiResponse<null>);
  }
});

/**
 * GET /payments/:paymentId/audit - Get payment audit logs
 */
router.get('/payments/:paymentId/audit', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const auditLogs = await paymentService.getPaymentAuditLogs(paymentId);

    res.status(200).json({
      success: true,
      data: auditLogs,
      message: 'Payment audit logs retrieved successfully'
    } as ApiResponse<typeof auditLogs>);

  } catch (error) {
    console.error('Error fetching payment audit logs:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment audit logs'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId/audit - Get payment audit logs for an order
 */
router.get('/orders/:orderId/audit', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const auditLogs = await paymentService.getPaymentAuditLogs(undefined, orderId);

    res.status(200).json({
      success: true,
      data: auditLogs,
      message: 'Order payment audit logs retrieved successfully'
    } as ApiResponse<typeof auditLogs>);

  } catch (error) {
    console.error('Error fetching order payment audit logs:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order payment audit logs'
    } as ApiResponse<null>);
  }
});

/**
 * POST /orders/:orderId/request-payment - Generate payment link for third party
 * This would be used for cases where someone else pays for the prescription
 */
router.post('/orders/:orderId/request-payment', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { recipientEmail, message } = req.body;

    // For now, we'll just generate a mock payment token
    // In real implementation, this would create a secure payment link
    const paymentToken = `pt_${Math.random().toString(36).substr(2, 16)}`;
    
    // Mock payment link
    const paymentLink = `${req.protocol}://${req.get('host')}/public/pay/${paymentToken}`;

    res.status(200).json({
      success: true,
      data: {
        paymentToken,
        paymentLink,
        orderId,
        recipientEmail,
        message
      },
      message: 'Payment link generated successfully'
    } as ApiResponse<{
      paymentToken: string;
      paymentLink: string;
      orderId: string;
      recipientEmail?: string;
      message?: string;
    }>);

  } catch (error) {
    console.error('Error generating payment link:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate payment link'
    } as ApiResponse<null>);
  }
});

/**
 * GET /public/pay/:paymentToken - Third-party payment interface (public endpoint)
 */
router.get('/public/pay/:paymentToken', async (req: Request, res: Response) => {
  try {
    const { paymentToken } = req.params;

    // In real implementation, this would validate the token and return payment details
    // For now, we'll return mock data
    
    const mockPaymentDetails = {
      paymentToken,
      orderId: 'order-123',
      amount: 45.50,
      currency: 'USD',
      description: 'Prescription order payment',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };

    res.status(200).json({
      success: true,
      data: mockPaymentDetails,
      message: 'Payment details retrieved successfully'
    } as ApiResponse<typeof mockPaymentDetails>);

  } catch (error) {
    console.error('Error fetching public payment details:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment details'
    } as ApiResponse<null>);
  }
});

/**
 * POST /public/pay/:paymentToken - Process third-party payment (public endpoint)
 */
router.post('/public/pay/:paymentToken', async (req: Request, res: Response) => {
  try {
    const { paymentToken } = req.params;
    const { gateway, paymentData } = req.body;

    // In real implementation, this would validate the token and process payment
    // For now, we'll simulate the process
    
    if (!gateway) {
      return res.status(400).json({
        success: false,
        error: 'Payment gateway is required'
      } as ApiResponse<null>);
    }

    // Mock processing
    const transactionId = `tx_${Math.random().toString(36).substr(2, 12)}`;
    
    res.status(200).json({
      success: true,
      data: {
        paymentToken,
        transactionId,
        status: 'succeeded',
        message: 'Payment completed successfully'
      },
      message: 'Third-party payment processed successfully'
    } as ApiResponse<{
      paymentToken: string;
      transactionId: string;
      status: string;
      message: string;
    }>);

  } catch (error) {
    console.error('Error processing third-party payment:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    } as ApiResponse<null>);
  }
});

/**
 * GET /payments/:paymentId/receipt - Get receipt details for a payment
 */
router.get('/payments/:paymentId/receipt', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const receipt = await receiptService.getReceiptByPaymentId(paymentId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found for this payment'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: receipt,
      message: 'Receipt details retrieved successfully'
    } as ApiResponse<typeof receipt>);

  } catch (error) {
    console.error('Error fetching receipt:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve receipt'
    } as ApiResponse<null>);
  }
});

/**
 * GET /payments/:paymentId/receipt/download - Download receipt PDF
 */
router.get('/payments/:paymentId/receipt/download', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const receipt = await receiptService.getReceiptByPaymentId(paymentId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found for this payment'
      } as ApiResponse<null>);
    }

    const pdfBuffer = await receiptService.getReceiptPDF(receipt.receiptId);

    if (!pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate receipt PDF'
      } as ApiResponse<null>);
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${receipt.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading receipt:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to download receipt'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId/receipt - Get receipt for an order (convenience endpoint)
 */
router.get('/orders/:orderId/receipt', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    // Get the successful payment for this order
    const payments = await paymentService.getPaymentsForOrder(orderId);
    const successfulPayment = payments.find(p => p.status === 'succeeded');

    if (!successfulPayment) {
      return res.status(404).json({
        success: false,
        error: 'No successful payment found for this order'
      } as ApiResponse<null>);
    }

    const receipt = await receiptService.getReceiptByPaymentId(successfulPayment.paymentId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found for this order'
      } as ApiResponse<null>);
    }

    res.status(200).json({
      success: true,
      data: receipt,
      message: 'Order receipt retrieved successfully'
    } as ApiResponse<typeof receipt>);

  } catch (error) {
    console.error('Error fetching order receipt:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order receipt'
    } as ApiResponse<null>);
  }
});

/**
 * POST /payments/:paymentId/receipt/regenerate - Regenerate receipt with custom info
 */
router.post('/payments/:paymentId/receipt/regenerate', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { pharmacyInfo, customerInfo } = req.body;

    // Validate required pharmacy info
    if (!pharmacyInfo || !pharmacyInfo.name || !pharmacyInfo.taxId) {
      return res.status(400).json({
        success: false,
        error: 'Valid pharmacy information is required'
      } as ApiResponse<null>);
    }

    const result = await receiptService.generateReceiptForPayment(
      paymentId,
      pharmacyInfo,
      customerInfo
    );

    res.status(200).json({
      success: true,
      data: {
        receiptId: result.receiptId,
        receiptNumber: result.receiptNumber,
        receiptDetails: result.receiptDetails
      },
      message: 'Receipt regenerated successfully'
    } as ApiResponse<{
      receiptId: string;
      receiptNumber: string;
      receiptDetails: any;
    }>);

  } catch (error) {
    console.error('Error regenerating receipt:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate receipt';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: errorMessage
    } as ApiResponse<null>);
  }
});

export default router;