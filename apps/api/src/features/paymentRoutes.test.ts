import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import paymentRoutes from './paymentRoutes';
import { paymentService } from './paymentService';
import { receiptService } from './receiptService';
import admin from 'firebase-admin';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({
      verifyIdToken: vi.fn()
    })
  }
}));

// Mock services
vi.mock('./paymentService');
vi.mock('./receiptService');

const mockPaymentService = vi.mocked(paymentService);
const mockReceiptService = vi.mocked(receiptService);
const mockAuth = vi.mocked(admin.auth());

const app = express();
app.use(express.json());
app.use('/api', paymentRoutes);

const validToken = 'valid-firebase-token';
const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

describe('Payment Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.verifyIdToken.mockResolvedValue(mockUser as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/orders/:orderId/pay', () => {
    const validPaymentData = {
      gateway: 'stripe',
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    it('should process payment successfully with valid data', async () => {
      const mockResult = {
        paymentId: 'payment-123',
        transactionId: 'ch_test123',
        status: 'succeeded'
      };

      mockPaymentService.processPayment.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          paymentId: 'payment-123',
          transactionId: 'ch_test123',
          status: 'succeeded'
        },
        message: 'Payment processed successfully'
      });

      expect(mockPaymentService.processPayment).toHaveBeenCalledWith({
        orderId: 'test-order-1',
        gateway: 'stripe',
        amount: 45.50,
        currency: 'USD',
        paymentData: validPaymentData.paymentData
      }, 'test-user-123');
    });

    it('should return 401 without valid authentication', async () => {
      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .send(validPaymentData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization token required');
    });

    it('should return 401 with invalid token', async () => {
      mockAuth.verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', 'Bearer invalid-token')
        .send(validPaymentData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid authorization token');
    });

    it('should return 400 with missing gateway', async () => {
      const invalidData = { ...validPaymentData };
      delete invalidData.gateway;

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment gateway is required');
    });

    it('should return 400 with invalid amount', async () => {
      const invalidData = { ...validPaymentData, amount: -10 };

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Valid payment amount is required');
    });

    it('should return 400 with missing currency', async () => {
      const invalidData = { ...validPaymentData };
      delete invalidData.currency;

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Currency is required');
    });

    it('should handle payment service errors', async () => {
      mockPaymentService.processPayment.mockRejectedValueOnce(
        new Error('Card declined by issuer')
      );

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Card declined by issuer');
    });

    it('should handle validation errors with 400 status', async () => {
      mockPaymentService.processPayment.mockRejectedValueOnce(
        new Error('Order validation failed: Order not found')
      );

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPaymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order validation failed: Order not found');
    });
  });

  describe('GET /api/orders/:orderId/payments', () => {
    it('should retrieve payment history successfully', async () => {
      const mockPayments = [
        {
          paymentId: 'payment-1',
          orderId: 'test-order-1',
          amount: 45.50,
          status: 'succeeded',
          createdAt: new Date()
        },
        {
          paymentId: 'payment-2',
          orderId: 'test-order-1',
          amount: 45.50,
          status: 'failed',
          createdAt: new Date()
        }
      ];

      mockPaymentService.getPaymentsForOrder.mockResolvedValueOnce(mockPayments);

      const response = await request(app)
        .get('/api/orders/test-order-1/payments')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockPayments,
        message: 'Payment history retrieved successfully'
      });

      expect(mockPaymentService.getPaymentsForOrder).toHaveBeenCalledWith('test-order-1');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/orders/test-order-1/payments');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/:paymentId', () => {
    it('should retrieve payment details successfully', async () => {
      const mockPayment = {
        paymentId: 'payment-123',
        orderId: 'test-order-1',
        amount: 45.50,
        status: 'succeeded',
        gateway: 'stripe'
      };

      mockPaymentService.getPayment.mockResolvedValueOnce(mockPayment);

      const response = await request(app)
        .get('/api/payments/payment-123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockPayment,
        message: 'Payment details retrieved successfully'
      });
    });

    it('should return 404 for non-existent payment', async () => {
      mockPaymentService.getPayment.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/payments/non-existent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment not found');
    });
  });

  describe('GET /api/payments/:paymentId/audit', () => {
    it('should retrieve payment audit logs', async () => {
      const mockAuditLogs = [
        {
          paymentId: 'payment-123',
          orderId: 'test-order-1',
          action: 'payment_processed',
          timestamp: new Date()
        }
      ];

      mockPaymentService.getPaymentAuditLogs.mockResolvedValueOnce(mockAuditLogs);

      const response = await request(app)
        .get('/api/payments/payment-123/audit')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockAuditLogs,
        message: 'Payment audit logs retrieved successfully'
      });

      expect(mockPaymentService.getPaymentAuditLogs).toHaveBeenCalledWith('payment-123');
    });
  });

  describe('POST /api/orders/:orderId/request-payment', () => {
    it('should generate payment link successfully', async () => {
      const requestData = {
        recipientEmail: 'payer@example.com',
        message: 'Please pay for prescription order'
      };

      const response = await request(app)
        .post('/api/orders/test-order-1/request-payment')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        paymentToken: expect.stringMatching(/^pt_/),
        paymentLink: expect.stringContaining('/public/pay/'),
        orderId: 'test-order-1',
        recipientEmail: 'payer@example.com',
        message: 'Please pay for prescription order'
      });
    });
  });

  describe('GET /api/public/pay/:paymentToken', () => {
    it('should retrieve public payment details', async () => {
      const response = await request(app)
        .get('/api/public/pay/test-token-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        paymentToken: 'test-token-123',
        orderId: expect.any(String),
        amount: expect.any(Number),
        currency: expect.any(String),
        description: expect.any(String)
      });
    });
  });

  describe('POST /api/public/pay/:paymentToken', () => {
    it('should process public payment', async () => {
      const paymentData = {
        gateway: 'stripe',
        paymentData: {
          cardNumber: '4242424242424242',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      const response = await request(app)
        .post('/api/public/pay/test-token-123')
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        paymentToken: 'test-token-123',
        transactionId: expect.stringMatching(/^tx_/),
        status: 'succeeded'
      });
    });

    it('should require gateway for public payment', async () => {
      const response = await request(app)
        .post('/api/public/pay/test-token-123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment gateway is required');
    });
  });

  describe('Receipt endpoints', () => {
    describe('GET /api/payments/:paymentId/receipt', () => {
      it('should retrieve receipt details', async () => {
        const mockReceipt = {
          receiptId: 'receipt-123',
          receiptNumber: 'BJ-2024-000001',
          paymentId: 'payment-123',
          receiptDetails: {
            totalAmount: 45.50,
            currency: 'USD'
          }
        };

        mockReceiptService.getReceiptByPaymentId.mockResolvedValueOnce(mockReceipt);

        const response = await request(app)
          .get('/api/payments/payment-123/receipt')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: mockReceipt,
          message: 'Receipt details retrieved successfully'
        });
      });

      it('should return 404 when receipt not found', async () => {
        mockReceiptService.getReceiptByPaymentId.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/api/payments/payment-123/receipt')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Receipt not found for this payment');
      });
    });

    describe('GET /api/payments/:paymentId/receipt/download', () => {
      it('should download receipt PDF', async () => {
        const mockReceipt = {
          receiptId: 'receipt-123',
          receiptNumber: 'BJ-2024-000001'
        };

        const mockPDFBuffer = Buffer.from('mock-pdf-content');

        mockReceiptService.getReceiptByPaymentId.mockResolvedValueOnce(mockReceipt);
        mockReceiptService.getReceiptPDF.mockResolvedValueOnce(mockPDFBuffer);

        const response = await request(app)
          .get('/api/payments/payment-123/receipt/download')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('facture-BJ-2024-000001.pdf');
        expect(Buffer.from(response.body)).toEqual(mockPDFBuffer);
      });

      it('should return 404 when receipt not found for download', async () => {
        mockReceiptService.getReceiptByPaymentId.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/api/payments/payment-123/receipt/download')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/orders/:orderId/receipt', () => {
      it('should retrieve receipt by order ID', async () => {
        const mockPayments = [{
          paymentId: 'payment-123',
          status: 'succeeded'
        }];

        const mockReceipt = {
          receiptId: 'receipt-123',
          receiptNumber: 'BJ-2024-000001'
        };

        mockPaymentService.getPaymentsForOrder.mockResolvedValueOnce(mockPayments);
        mockReceiptService.getReceiptByPaymentId.mockResolvedValueOnce(mockReceipt);

        const response = await request(app)
          .get('/api/orders/test-order-1/receipt')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockReceipt);
      });

      it('should return 404 when no successful payment found', async () => {
        mockPaymentService.getPaymentsForOrder.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/api/orders/test-order-1/receipt')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('No successful payment found for this order');
      });
    });

    describe('POST /api/payments/:paymentId/receipt/regenerate', () => {
      it('should regenerate receipt with custom info', async () => {
        const customInfo = {
          pharmacyInfo: {
            name: 'Custom Pharmacy',
            address: 'Custom Address',
            phone: '+229123456789',
            email: 'custom@pharmacy.com',
            licenseNumber: 'PHM-001',
            taxId: 'NIF-001'
          },
          customerInfo: {
            name: 'John Doe',
            taxId: 'NIF-CUSTOMER-001'
          }
        };

        const mockResult = {
          receiptId: 'receipt-new-123',
          receiptNumber: 'BJ-2024-000002',
          receiptDetails: {}
        };

        mockReceiptService.generateReceiptForPayment.mockResolvedValueOnce(mockResult);

        const response = await request(app)
          .post('/api/payments/payment-123/receipt/regenerate')
          .set('Authorization', `Bearer ${validToken}`)
          .send(customInfo);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          receiptId: 'receipt-new-123',
          receiptNumber: 'BJ-2024-000002'
        });

        expect(mockReceiptService.generateReceiptForPayment).toHaveBeenCalledWith(
          'payment-123',
          customInfo.pharmacyInfo,
          customInfo.customerInfo
        );
      });

      it('should return 400 with invalid pharmacy info', async () => {
        const invalidInfo = {
          pharmacyInfo: {
            name: 'Custom Pharmacy'
            // Missing required taxId
          }
        };

        const response = await request(app)
          .post('/api/payments/payment-123/receipt/regenerate')
          .set('Authorization', `Bearer ${validToken}`)
          .send(invalidInfo);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Valid pharmacy information is required');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle service unavailable errors', async () => {
      mockPaymentService.processPayment.mockRejectedValueOnce(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          gateway: 'stripe',
          amount: 45.50,
          currency: 'USD',
          paymentData: {}
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send('invalid-json');

      expect(response.status).toBe(400);
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        gateway: 'stripe',
        amount: 45.50,
        currency: 'USD',
        paymentData: {
          cardNumber: '4242424242424242',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'A'.repeat(10000) // Very long name
        }
      };

      const response = await request(app)
        .post('/api/orders/test-order-1/pay')
        .set('Authorization', `Bearer ${validToken}`)
        .send(largePayload);

      // Should either process or reject with appropriate error
      expect([200, 400, 413]).toContain(response.status);
    });
  });
});