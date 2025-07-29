import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import paymentLinkRoutes from './paymentLinkRoutes';
import { PaymentLinkService } from './paymentLinkService';

// Mock the PaymentLinkService
vi.mock('./paymentLinkService');

// Mock authentication middleware
const mockAuthenticateToken = (req: any, res: any, next: any) => {
  req.user = { uid: 'test-user-123' };
  next();
};

// Mock validation middleware
const mockValidateRequest = (req: any, res: any, next: any) => {
  next();
};

vi.mock('../middleware/auth', () => ({
  authenticateToken: mockAuthenticateToken
}));

vi.mock('../middleware/validation', () => ({
  validateRequest: mockValidateRequest
}));

describe('PaymentLink Routes Integration Tests', () => {
  let app: express.Application;
  let mockPaymentLinkService: any;

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api', paymentLinkRoutes);

    // Setup service mock
    mockPaymentLinkService = {
      verifyOrderOwnership: vi.fn(),
      getOrderStatus: vi.fn(),
      generatePaymentLink: vi.fn(),
      sendPaymentLinkMessage: vi.fn(),
      getPaymentLinksForOrder: vi.fn(),
      deactivatePaymentLink: vi.fn()
    };

    (PaymentLinkService as any).mockImplementation(() => mockPaymentLinkService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orders/:orderId/request-payment', () => {
    const validRequest = {
      recipientPhone: '+22912345678',
      messageType: 'whatsapp'
    };

    it('should create payment link successfully', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('awaiting_payment');
      mockPaymentLinkService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          linkId: 'link-123',
          paymentToken: 'token-123',
          publicUrl: 'https://pharmarx.com/pay/token-123',
          expiresAt: new Date('2024-12-21T12:00:00Z')
        }
      });
      mockPaymentLinkService.sendPaymentLinkMessage.mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://pharmarx.com/pay/token-123',
        expiresAt: '2024-12-21T12:00:00.000Z'
      });

      expect(mockPaymentLinkService.verifyOrderOwnership).toHaveBeenCalledWith('test-order-123', 'test-user-123');
      expect(mockPaymentLinkService.getOrderStatus).toHaveBeenCalledWith('test-order-123');
      expect(mockPaymentLinkService.generatePaymentLink).toHaveBeenCalledWith({
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'whatsapp'
      });
    });

    it('should return 404 for non-existent order', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/orders/non-existent-order/request-payment')
        .send(validRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found or access denied');
    });

    it('should return 400 for wrong order status', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('completed');

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order must be in awaiting_payment status to request payment from third party');
    });

    it('should return 400 when payment link generation fails', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('awaiting_payment');
      mockPaymentLinkService.generatePaymentLink.mockResolvedValue({
        success: false,
        error: 'Token generation failed'
      });

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token generation failed');
    });

    it('should return 207 when message sending fails', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('awaiting_payment');
      mockPaymentLinkService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          linkId: 'link-123',
          paymentToken: 'token-123',
          publicUrl: 'https://pharmarx.com/pay/token-123',
          expiresAt: new Date()
        }
      });
      mockPaymentLinkService.sendPaymentLinkMessage.mockResolvedValue({
        success: false,
        error: 'WhatsApp API unavailable'
      });

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(207);

      expect(response.body.success).toBe(true);
      expect(response.body.error).toContain('failed to send whatsapp');
    });

    it('should validate phone number format', async () => {
      const invalidRequest = {
        recipientPhone: 'invalid-phone',
        messageType: 'whatsapp'
      };

      // Mock validation middleware to actually validate
      const mockValidateRequestWithError = (req: any, res: any, next: any) => {
        return res.status(400).json({
          success: false,
          error: 'Valid international phone number is required (E.164 format)'
        });
      };

      // Override the validation mock for this test
      vi.doMock('../middleware/validation', () => ({
        validateRequest: mockValidateRequestWithError
      }));

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate message type', async () => {
      const invalidRequest = {
        recipientPhone: '+22912345678',
        messageType: 'invalid-type'
      };

      const mockValidateRequestWithError = (req: any, res: any, next: any) => {
        return res.status(400).json({
          success: false,
          error: 'Message type must be either "whatsapp" or "sms"'
        });
      };

      vi.doMock('../middleware/validation', () => ({
        validateRequest: mockValidateRequestWithError
      }));

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/orders/:orderId/payment-links', () => {
    it('should return payment links for authorized user', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getPaymentLinksForOrder.mockResolvedValue([
        {
          linkId: 'link-123',
          orderId: 'test-order-123',
          paymentToken: 'token-123',
          recipientPhone: '+22912345678',
          messageType: 'whatsapp',
          isUsed: false,
          expiresAt: new Date('2024-12-21T12:00:00Z'),
          createdAt: new Date('2024-12-19T12:00:00Z')
        }
      ]);

      const response = await request(app)
        .get('/api/orders/test-order-123/payment-links')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].linkId).toBe('link-123');
    });

    it('should return 404 for non-existent order', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/orders/non-existent-order/payment-links')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found or access denied');
    });

    it('should handle service errors', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/orders/test-order-123/payment-links')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('DELETE /api/payment-links/:linkId', () => {
    it('should deactivate payment link successfully', async () => {
      mockPaymentLinkService.deactivatePaymentLink.mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .delete('/api/payment-links/link-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPaymentLinkService.deactivatePaymentLink).toHaveBeenCalledWith('link-123', 'test-user-123');
    });

    it('should return 404 for non-existent payment link', async () => {
      mockPaymentLinkService.deactivatePaymentLink.mockResolvedValue({
        success: false,
        error: 'Payment link not found'
      });

      const response = await request(app)
        .delete('/api/payment-links/non-existent-link')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment link not found');
    });

    it('should return 403 for unauthorized access', async () => {
      mockPaymentLinkService.deactivatePaymentLink.mockResolvedValue({
        success: false,
        error: 'Access denied'
      });

      const response = await request(app)
        .delete('/api/payment-links/link-123')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should handle service errors', async () => {
      mockPaymentLinkService.deactivatePaymentLink.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/payment-links/link-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Authentication Tests', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock authentication to fail
      const mockUnauthenticatedRequest = (req: any, res: any, next: any) => {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      };

      vi.doMock('../middleware/auth', () => ({
        authenticateToken: mockUnauthenticatedRequest
      }));

      // Test all protected endpoints
      await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send({ recipientPhone: '+22912345678', messageType: 'whatsapp' })
        .expect(401);

      await request(app)
        .get('/api/orders/test-order-123/payment-links')
        .expect(401);

      await request(app)
        .delete('/api/payment-links/link-123')
        .expect(401);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle concurrent requests safely', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('awaiting_payment');
      mockPaymentLinkService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          linkId: 'link-123',
          paymentToken: 'token-123',
          publicUrl: 'https://pharmarx.com/pay/token-123',
          expiresAt: new Date()
        }
      });
      mockPaymentLinkService.sendPaymentLinkMessage.mockResolvedValue({
        success: true
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/orders/test-order-123/request-payment')
          .send(validRequest)
      );

      const responses = await Promise.all(requests);

      // All requests should be handled without error
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should sanitize sensitive data in responses', async () => {
      mockPaymentLinkService.verifyOrderOwnership.mockResolvedValue(true);
      mockPaymentLinkService.getOrderStatus.mockResolvedValue('awaiting_payment');
      mockPaymentLinkService.generatePaymentLink.mockResolvedValue({
        success: true,
        data: {
          linkId: 'link-123',
          paymentToken: 'token-123',
          publicUrl: 'https://pharmarx.com/pay/token-123',
          expiresAt: new Date(),
          internalData: 'sensitive-info' // This should not be in response
        }
      });
      mockPaymentLinkService.sendPaymentLinkMessage.mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .post('/api/orders/test-order-123/request-payment')
        .send(validRequest)
        .expect(201);

      // Should not contain internal sensitive data
      expect(response.body.data.internalData).toBeUndefined();
      // Should contain expected public data
      expect(response.body.data.publicUrl).toBeDefined();
    });
  });
});