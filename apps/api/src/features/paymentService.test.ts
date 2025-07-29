import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentService, ProcessPaymentRequest } from './paymentService';
import { db } from './database';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user-123' })
    })
  }
}));

// Mock database
vi.mock('./database', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        id: 'mock-doc-id',
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            orderId: 'test-order-1',
            status: 'awaiting_payment',
            cost: 45.50
          })
        }),
        update: vi.fn().mockResolvedValue({})
      })),
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: true,
            docs: []
          })
        })),
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: []
        }),
        orderBy: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            docs: []
          })
        }))
      })),
      orderBy: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      }))
    }))
  }
}));

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should successfully process a Stripe payment', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
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

      const result = await paymentService.processPayment(request, 'test-user-123');

      expect(result).toMatchObject({
        paymentId: expect.any(String),
        transactionId: expect.stringMatching(/^ch_/),
        status: 'succeeded'
      });
    });

    it('should successfully process a PayPal payment', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'paypal',
        amount: 45.50,
        currency: 'USD',
        paymentData: {}
      };

      const result = await paymentService.processPayment(request, 'test-user-123');

      expect(result).toMatchObject({
        paymentId: expect.any(String),
        transactionId: expect.stringMatching(/^PP/),
        status: 'succeeded'
      });
    });

    it('should successfully process an MTN Mobile Money payment', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'mtn',
        amount: 45.50,
        currency: 'USD',
        paymentData: {
          phoneNumber: '+22912345678'
        }
      };

      const result = await paymentService.processPayment(request, 'test-user-123');

      expect(result).toMatchObject({
        paymentId: expect.any(String),
        transactionId: expect.stringMatching(/^MTN/),
        status: 'succeeded'
      });
    });

    it('should fail Stripe payment with card ending in 0000', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'stripe',
        amount: 45.50,
        currency: 'USD',
        paymentData: {
          cardNumber: '4242424242420000',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Card declined by issuer');
    });

    it('should fail MTN payment with phone number containing 0000', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'mtn',
        amount: 45.50,
        currency: 'USD',
        paymentData: {
          phoneNumber: '+229000012345'
        }
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Insufficient balance in mobile money account');
    });

    it('should validate required Stripe payment data', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'stripe',
        amount: 45.50,
        currency: 'USD',
        paymentData: {
          cardNumber: '4242424242424242'
          // Missing required fields
        }
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Payment validation failed: All card details are required for Stripe payments');
    });

    it('should validate required MTN payment data', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'mtn',
        amount: 45.50,
        currency: 'USD',
        paymentData: {}
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Payment validation failed: Phone number is required for MTN Mobile Money');
    });

    it('should validate order exists and is in correct state', async () => {
      // Mock order not found
      const mockGet = vi.fn().mockResolvedValue({
        exists: false
      });
      
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet
        }))
      });

      const request: ProcessPaymentRequest = {
        orderId: 'non-existent-order',
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

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Order validation failed: Order not found');
    });

    it('should validate payment amount', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'stripe',
        amount: -10, // Invalid amount
        currency: 'USD',
        paymentData: {
          cardNumber: '4242424242424242',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'John Doe'
        }
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Payment validation failed: Valid amount is required');
    });

    it('should reject unsupported payment gateway', async () => {
      const request: ProcessPaymentRequest = {
        orderId: 'test-order-1',
        gateway: 'unsupported' as any,
        amount: 45.50,
        currency: 'USD',
        paymentData: {}
      };

      await expect(paymentService.processPayment(request, 'test-user-123'))
        .rejects.toThrow('Payment validation failed: Unsupported payment gateway: unsupported');
    });
  });

  describe('getPayment', () => {
    it('should return payment when it exists', async () => {
      const mockPayment = {
        paymentId: 'test-payment-1',
        orderId: 'test-order-1',
        amount: 45.50,
        status: 'succeeded'
      };

      const mockGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockPayment
      });

      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet
        }))
      });

      const result = await paymentService.getPayment('test-payment-1');

      expect(result).toEqual(mockPayment);
    });

    it('should return null when payment does not exist', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        exists: false
      });

      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet
        }))
      });

      const result = await paymentService.getPayment('non-existent-payment');

      expect(result).toBeNull();
    });
  });

  describe('getPaymentsForOrder', () => {
    it('should return payments for an order', async () => {
      const mockPayments = [
        {
          paymentId: 'payment-1',
          orderId: 'test-order-1',
          amount: 45.50,
          status: 'succeeded'
        },
        {
          paymentId: 'payment-2',
          orderId: 'test-order-1',
          amount: 45.50,
          status: 'failed'
        }
      ];

      const mockGet = vi.fn().mockResolvedValue({
        docs: mockPayments.map(payment => ({
          data: () => payment
        }))
      });

      const mockOrderBy = vi.fn().mockReturnValue({
        get: mockGet
      });

      const mockWhere = vi.fn().mockReturnValue({
        orderBy: mockOrderBy
      });

      (db.collection as any).mockReturnValue({
        where: mockWhere
      });

      const result = await paymentService.getPaymentsForOrder('test-order-1');

      expect(result).toEqual(mockPayments);
      expect(mockWhere).toHaveBeenCalledWith('orderId', '==', 'test-order-1');
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('processWebhook', () => {
    it('should process Stripe webhook successfully', async () => {
      const stripePayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded'
          }
        }
      };

      // Mock finding payment by transaction ID
      const mockGet = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            paymentId: 'test-payment-1',
            orderId: 'test-order-1',
            status: 'pending'
          }),
          ref: {
            update: vi.fn().mockResolvedValue({})
          }
        }]
      });

      const mockWhere = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: mockGet
        })
      });

      (db.collection as any).mockReturnValue({
        where: mockWhere,
        doc: vi.fn(() => ({
          set: vi.fn().mockResolvedValue({})
        }))
      });

      await expect(paymentService.processWebhook('stripe', stripePayload, 'valid-signature'))
        .resolves.not.toThrow();
    });

    it('should process PayPal webhook successfully', async () => {
      const paypalPayload = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE123'
        }
      };

      // Mock finding payment by transaction ID
      const mockGet = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            paymentId: 'test-payment-1',
            orderId: 'test-order-1',
            status: 'pending'
          }),
          ref: {
            update: vi.fn().mockResolvedValue({})
          }
        }]
      });

      const mockWhere = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: mockGet
        })
      });

      (db.collection as any).mockReturnValue({
        where: mockWhere,
        doc: vi.fn(() => ({
          set: vi.fn().mockResolvedValue({})
        }))
      });

      await expect(paymentService.processWebhook('paypal', paypalPayload, 'valid-signature'))
        .resolves.not.toThrow();
    });

    it('should process MTN webhook successfully', async () => {
      const mtnPayload = {
        transactionId: 'MTN123',
        status: 'SUCCESSFUL'
      };

      // Mock finding payment by transaction ID
      const mockGet = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            paymentId: 'test-payment-1',
            orderId: 'test-order-1',
            status: 'pending'
          }),
          ref: {
            update: vi.fn().mockResolvedValue({})
          }
        }]
      });

      const mockWhere = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: mockGet
        })
      });

      (db.collection as any).mockReturnValue({
        where: mockWhere,
        doc: vi.fn(() => ({
          set: vi.fn().mockResolvedValue({})
        }))
      });

      await expect(paymentService.processWebhook('mtn', mtnPayload, 'valid-signature'))
        .resolves.not.toThrow();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = { type: 'test' };

      await expect(paymentService.processWebhook('stripe', payload))
        .rejects.toThrow('Invalid webhook signature');
    });
  });
});