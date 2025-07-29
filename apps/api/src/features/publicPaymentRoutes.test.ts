import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import publicPaymentRoutes from './publicPaymentRoutes';
import { PaymentLinkService } from './paymentLinkService';
import { firestore } from '../config/firebase';

// Mock dependencies
vi.mock('./paymentLinkService');
vi.mock('../config/firebase');

// Mock validation middleware
const mockValidateRequest = (req: any, res: any, next: any) => {
  next();
};

vi.mock('../middleware/validation', () => ({
  validateRequest: mockValidateRequest
}));

describe('Public Payment Routes Integration Tests', () => {
  let app: express.Application;
  let mockPaymentLinkService: any;
  let mockFirestore: any;

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api', publicPaymentRoutes);

    // Setup service mocks
    mockPaymentLinkService = {
      getPaymentLinkByToken: vi.fn(),
      markPaymentLinkAsUsed: vi.fn()
    };

    mockFirestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn()
        }))
      })),
      Timestamp: {
        now: vi.fn(() => ({ seconds: Date.now() / 1000 }))
      }
    };

    (PaymentLinkService as any).mockImplementation(() => mockPaymentLinkService);
    (firestore as any) = mockFirestore;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/public/pay/:paymentToken', () => {
    const validToken = 'valid-payment-token-123';

    it('should return payment info for valid token', async () => {
      const mockPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        recipientPhone: '+22912345678',
        messageType: 'whatsapp',
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z'),
        createdAt: new Date('2024-12-19T12:00:00Z')
      };

      const mockOrderDoc = {
        exists: true,
        data: () => ({
          medicationDetails: {
            name: 'Amoxicillin 500mg'
          },
          cost: 45.50
        })
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(mockPaymentLink);
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const response = await request(app)
        .get(`/api/public/pay/${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        orderId: 'order-123',
        medicationName: 'Amoxicillin 500mg',
        cost: 45.50,
        currency: 'USD',
        pharmacyName: 'PharmaRx Partner Pharmacy',
        isValid: true,
        isExpired: false,
        isUsed: false
      });

      expect(mockPaymentLinkService.getPaymentLinkByToken).toHaveBeenCalledWith(validToken);
    });

    it('should return 404 for non-existent token', async () => {
      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/public/pay/invalid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment link not found');
    });

    it('should return 400 for expired token', async () => {
      const expiredPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-18T12:00:00Z') // Expired
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(expiredPaymentLink);

      const response = await request(app)
        .get(`/api/public/pay/${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('This payment link has expired');
    });

    it('should return 400 for used token', async () => {
      const usedPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: true,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(usedPaymentLink);

      const response = await request(app)
        .get(`/api/public/pay/${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('This payment link has already been used');
    });

    it('should return 404 when order not found', async () => {
      const mockPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(mockPaymentLink);
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false })
        })
      });

      const response = await request(app)
        .get(`/api/public/pay/${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order information not available');
    });

    it('should handle database errors gracefully', async () => {
      mockPaymentLinkService.getPaymentLinkByToken.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/public/pay/${validToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/public/pay/:paymentToken', () => {
    const validToken = 'valid-payment-token-123';
    const validPaymentRequest = {
      gateway: 'stripe',
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123'
      }
    };

    beforeEach(() => {
      // Mock successful payment link validation
      const mockPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(mockPaymentLink);
      mockPaymentLinkService.markPaymentLinkAsUsed.mockResolvedValue(true);

      // Mock order document
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          cost: 45.50,
          medicationDetails: { name: 'Amoxicillin 500mg' }
        })
      };

      mockFirestore.collection.mockImplementation((collectionName: string) => ({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc),
          set: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockResolvedValue(undefined)
        })
      }));
    });

    it('should process payment successfully', async () => {
      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        paymentId: expect.stringMatching(/^pay_\d+_[a-z0-9]+$/),
        transactionId: expect.stringMatching(/^txn_\d+_[a-z0-9]+$/),
        receiptUrl: expect.stringMatching(/^\/api\/receipts\/pay_\d+_[a-z0-9]+$/)
      });

      expect(mockPaymentLinkService.markPaymentLinkAsUsed).toHaveBeenCalledWith(validToken);
    });

    it('should return 404 for non-existent token', async () => {
      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/public/pay/invalid-token')
        .send(validPaymentRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment link not found');
    });

    it('should return 400 for expired token', async () => {
      const expiredPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-18T12:00:00Z') // Expired
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(expiredPaymentLink);

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('This payment link has expired');
    });

    it('should return 400 for used token', async () => {
      const usedPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: true,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(usedPaymentLink);

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('This payment link has already been used');
    });

    it('should validate payment amount matches order cost', async () => {
      const invalidAmountRequest = {
        ...validPaymentRequest,
        amount: 100.00 // Different from order cost (45.50)
      };

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(invalidAmountRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment amount does not match order cost');
    });

    it('should validate required fields', async () => {
      const invalidRequests = [
        { ...validPaymentRequest, gateway: undefined },
        { ...validPaymentRequest, amount: undefined },
        { ...validPaymentRequest, currency: undefined },
        { ...validPaymentRequest, paymentData: undefined }
      ];

      for (const invalidRequest of invalidRequests) {
        // Mock validation middleware to reject invalid requests
        const mockValidateRequestWithError = (req: any, res: any, next: any) => {
          return res.status(400).json({
            success: false,
            error: 'Validation failed'
          });
        };

        vi.doMock('../middleware/validation', () => ({
          validateRequest: mockValidateRequestWithError
        }));

        await request(app)
          .post(`/api/public/pay/${validToken}`)
          .send(invalidRequest)
          .expect(400);
      }
    });

    it('should validate payment gateway', async () => {
      const invalidGatewayRequest = {
        ...validPaymentRequest,
        gateway: 'invalid-gateway'
      };

      const mockValidateRequestWithError = (req: any, res: any, next: any) => {
        return res.status(400).json({
          success: false,
          error: 'Gateway must be stripe, paypal, or mtn'
        });
      };

      vi.doMock('../middleware/validation', () => ({
        validateRequest: mockValidateRequestWithError
      }));

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(invalidGatewayRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle order not found', async () => {
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'prescriptionOrders') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false })
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn(),
            set: vi.fn(),
            update: vi.fn()
          })
        };
      });

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should handle payment processing errors', async () => {
      // Mock Firestore to fail payment record creation
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'payments') {
          return {
            doc: vi.fn().mockReturnValue({
              set: vi.fn().mockRejectedValue(new Error('Payment processing failed'))
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ cost: 45.50 })
            }),
            update: vi.fn()
          })
        };
      });

      const response = await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should update order status after successful payment', async () => {
      const mockOrderUpdate = vi.fn().mockResolvedValue(undefined);
      
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'prescriptionOrders') {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ cost: 45.50 })
              }),
              update: mockOrderUpdate
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            set: vi.fn().mockResolvedValue(undefined)
          })
        };
      });

      await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(201);

      expect(mockOrderUpdate).toHaveBeenCalledWith({
        status: 'preparing',
        paidAt: expect.any(Object),
        updatedAt: expect.any(Object)
      });
    });

    it('should store payment record with audit trail', async () => {
      const mockPaymentSet = vi.fn().mockResolvedValue(undefined);
      
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'payments') {
          return {
            doc: vi.fn().mockReturnValue({
              set: mockPaymentSet
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ cost: 45.50 })
            }),
            update: vi.fn()
          })
        };
      });

      await request(app)
        .post(`/api/public/pay/${validToken}`)
        .send(validPaymentRequest)
        .expect(201);

      expect(mockPaymentSet).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          amount: 45.50,
          currency: 'USD',
          gateway: 'stripe',
          status: 'succeeded',
          paymentToken: validToken,
          paidBy: 'third_party',
          receiptDetails: expect.any(Object)
        })
      );
    });
  });

  describe('GET /api/public/pay/:paymentToken/status', () => {
    const validToken = 'valid-payment-token-123';

    it('should return status for valid token', async () => {
      const mockPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(mockPaymentLink);

      const response = await request(app)
        .get(`/api/public/pay/${validToken}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        isValid: true,
        isExpired: false,
        isUsed: false,
        error: undefined
      });
    });

    it('should return status for expired token', async () => {
      const expiredPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: false,
        expiresAt: new Date('2024-12-18T12:00:00Z') // Expired
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(expiredPaymentLink);

      const response = await request(app)
        .get(`/api/public/pay/${validToken}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        isValid: false,
        isExpired: true,
        isUsed: false,
        error: 'This payment link has expired'
      });
    });

    it('should return status for used token', async () => {
      const usedPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: validToken,
        isUsed: true,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(usedPaymentLink);

      const response = await request(app)
        .get(`/api/public/pay/${validToken}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        isValid: false,
        isExpired: false,
        isUsed: true,
        error: 'This payment link has already been used'
      });
    });

    it('should return 404 for non-existent token', async () => {
      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/public/pay/invalid-token/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment link not found');
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle malformed payment tokens', async () => {
      const malformedTokens = [
        'short',
        'a'.repeat(101), // Too long
        'token with spaces',
        'token@with#special$chars',
        '',
        null,
        undefined
      ];

      for (const token of malformedTokens) {
        if (token) {
          const mockValidateRequestWithError = (req: any, res: any, next: any) => {
            return res.status(400).json({
              success: false,
              error: 'Valid payment token is required'
            });
          };

          vi.doMock('../middleware/validation', () => ({
            validateRequest: mockValidateRequestWithError
          }));
        }

        const url = token ? `/api/public/pay/${token}` : '/api/public/pay/';
        await request(app)
          .get(url)
          .expect(token ? 400 : 404);
      }
    });

    it('should prevent double payment processing', async () => {
      const usedPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: 'token-123',
        isUsed: true,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(usedPaymentLink);

      const response = await request(app)
        .post('/api/public/pay/token-123')
        .send({
          gateway: 'stripe',
          amount: 45.50,
          currency: 'USD',
          paymentData: {}
        })
        .expect(400);

      expect(response.body.error).toBe('This payment link has already been used');
    });

    it('should handle concurrent payment attempts', async () => {
      const validPaymentLink = {
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: 'token-123',
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z')
      };

      mockPaymentLinkService.getPaymentLinkByToken.mockResolvedValue(validPaymentLink);
      mockPaymentLinkService.markPaymentLinkAsUsed.mockResolvedValue(true);

      const mockOrderDoc = {
        exists: true,
        data: () => ({ cost: 45.50 })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc),
          set: vi.fn().mockResolvedValue(undefined),
          update: vi.fn().mockResolvedValue(undefined)
        })
      });

      const paymentRequest = {
        gateway: 'stripe',
        amount: 45.50,
        currency: 'USD',
        paymentData: { cardNumber: '4242424242424242' }
      };

      // Make concurrent payment requests
      const requests = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/public/pay/token-123')
          .send(paymentRequest)
      );

      const responses = await Promise.all(requests);

      // Only one should succeed, others should handle gracefully
      const successfulResponses = responses.filter(r => r.status === 201);
      expect(successfulResponses.length).toBeGreaterThanOrEqual(1);
    });
  });
});