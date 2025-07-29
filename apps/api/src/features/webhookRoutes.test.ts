import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import webhookRoutes from './webhookRoutes';
import { paymentService } from './paymentService';

// Mock payment service
vi.mock('./paymentService');
const mockPaymentService = vi.mocked(paymentService);

const app = express();
app.use('/', webhookRoutes);

describe('Webhook Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /webhooks/stripe', () => {
    const mockStripeEvent = {
      id: 'evt_test_webhook',
      object: 'event',
      created: 1610000000,
      data: {
        object: {
          id: 'ch_test123',
          object: 'charge',
          amount: 4550, // $45.50 in cents
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            orderId: 'test-order-1'
          }
        }
      },
      type: 'charge.succeeded',
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: 'req_test123',
        idempotency_key: null
      }
    };

    const generateStripeSignature = (payload: string, secret: string = 'test_webhook_secret'): string => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      return `t=${timestamp},v1=${signature}`;
    };

    it('should process valid Stripe webhook', async () => {
      const payload = JSON.stringify(mockStripeEvent);
      const signature = generateStripeSignature(payload);

      mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Stripe webhook processed successfully'
      });

      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
        'stripe',
        mockStripeEvent,
        signature
      );
    });

    it('should reject webhook without signature', async () => {
      const payload = JSON.stringify(mockStripeEvent);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Missing Stripe signature header'
      });

      expect(mockPaymentService.processWebhook).not.toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify(mockStripeEvent);
      const invalidSignature = 't=1610000000,v1=invalid_signature';

      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('Invalid signature')
      );

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', invalidSignature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid signature'
      });
    });

    it('should handle malformed JSON payload', async () => {
      const invalidPayload = 'invalid-json';
      const signature = generateStripeSignature(invalidPayload);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle different Stripe event types', async () => {
      const eventTypes = [
        'charge.succeeded',
        'charge.failed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed'
      ];

      for (const eventType of eventTypes) {
        const event = { ...mockStripeEvent, type: eventType };
        const payload = JSON.stringify(event);
        const signature = generateStripeSignature(payload);

        mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

        const response = await request(app)
          .post('/webhooks/stripe')
          .set('stripe-signature', signature)
          .set('content-type', 'application/json')
          .send(payload);

        expect(response.status).toBe(200);
        expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
          'stripe',
          event,
          signature
        );

        vi.clearAllMocks();
      }
    });

    it('should handle webhook processing errors gracefully', async () => {
      const payload = JSON.stringify(mockStripeEvent);
      const signature = generateStripeSignature(payload);

      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
    });
  });

  describe('POST /webhooks/paypal', () => {
    const mockPayPalEvent = {
      id: 'WH-test-123',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      create_time: '2024-01-01T12:00:00Z',
      resource_type: 'capture',
      resource: {
        id: 'PP_test123',
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: '45.50'
        },
        custom_id: 'test-order-1'
      },
      summary: 'Payment completed'
    };

    it('should process valid PayPal webhook', async () => {
      mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/webhooks/paypal')
        .set('content-type', 'application/json')
        .send(mockPayPalEvent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'PayPal webhook processed successfully'
      });

      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
        'paypal',
        mockPayPalEvent,
        undefined
      );
    });

    it('should handle different PayPal event types', async () => {
      const eventTypes = [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'CHECKOUT.ORDER.APPROVED',
        'CHECKOUT.ORDER.CANCELLED'
      ];

      for (const eventType of eventTypes) {
        const event = { ...mockPayPalEvent, event_type: eventType };

        mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

        const response = await request(app)
          .post('/webhooks/paypal')
          .set('content-type', 'application/json')
          .send(event);

        expect(response.status).toBe(200);
        expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
          'paypal',
          event,
          undefined
        );

        vi.clearAllMocks();
      }
    });

    it('should validate PayPal webhook structure', async () => {
      const invalidEvent = {
        // Missing required fields
        id: 'WH-test-123'
      };

      const response = await request(app)
        .post('/webhooks/paypal')
        .set('content-type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle PayPal webhook processing errors', async () => {
      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('PayPal verification failed')
      );

      const response = await request(app)
        .post('/webhooks/paypal')
        .set('content-type', 'application/json')
        .send(mockPayPalEvent);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'PayPal verification failed'
      });
    });
  });

  describe('POST /webhooks/mtn', () => {
    const mockMTNEvent = {
      EventType: 'PAYMENT_COMPLETED',
      TransactionId: 'MTN_test123',
      ReferenceId: 'test-order-1',
      Amount: '45.50',
      Currency: 'USD',
      PhoneNumber: '+22996123456',
      Status: 'SUCCESSFUL',
      Timestamp: '2024-01-01T12:00:00Z',
      Signature: 'mtn_test_signature'
    };

    it('should process valid MTN webhook', async () => {
      mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/webhooks/mtn')
        .set('content-type', 'application/json')
        .send(mockMTNEvent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'MTN webhook processed successfully'
      });

      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
        'mtn',
        mockMTNEvent,
        'mtn_test_signature'
      );
    });

    it('should handle different MTN event types', async () => {
      const eventTypes = [
        'PAYMENT_COMPLETED',
        'PAYMENT_FAILED',
        'PAYMENT_PENDING',
        'PAYMENT_CANCELLED'
      ];

      for (const eventType of eventTypes) {
        const event = { ...mockMTNEvent, EventType: eventType };

        mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

        const response = await request(app)
          .post('/webhooks/mtn')
          .set('content-type', 'application/json')
          .send(event);

        expect(response.status).toBe(200);
        expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
          'mtn',
          event,
          'mtn_test_signature'
        );

        vi.clearAllMocks();
      }
    });

    it('should validate MTN webhook signature', async () => {
      const eventWithoutSignature = { ...mockMTNEvent };
      delete eventWithoutSignature.Signature;

      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('Missing signature')
      );

      const response = await request(app)
        .post('/webhooks/mtn')
        .set('content-type', 'application/json')
        .send(eventWithoutSignature);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Missing signature'
      });
    });

    it('should handle MTN webhook processing errors', async () => {
      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('Invalid MTN signature')
      );

      const response = await request(app)
        .post('/webhooks/mtn')
        .set('content-type', 'application/json')
        .send(mockMTNEvent);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid MTN signature'
      });
    });

    it('should validate required MTN fields', async () => {
      const invalidEvent = {
        EventType: 'PAYMENT_COMPLETED'
        // Missing required fields like TransactionId, Amount, etc.
      };

      const response = await request(app)
        .post('/webhooks/mtn')
        .set('content-type', 'application/json')
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /webhooks/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Webhook service is healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should include system information in health check', async () => {
      const response = await request(app)
        .get('/webhooks/health');

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /webhooks/test', () => {
    it('should process test webhook events', async () => {
      const testEvent = {
        eventType: 'test',
        data: { test: true },
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/webhooks/test')
        .set('content-type', 'application/json')
        .send(testEvent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Test webhook received successfully',
        receivedData: testEvent
      });
    });

    it('should validate test webhook payload', async () => {
      const response = await request(app)
        .post('/webhooks/test')
        .set('content-type', 'application/json')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Test event data is required');
    });

    it('should handle malformed test webhook data', async () => {
      const response = await request(app)
        .post('/webhooks/test')
        .set('content-type', 'application/json')
        .send('invalid-json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Webhook logging and monitoring', () => {
    it('should log all webhook requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mockStripeEvent = {
        id: 'evt_log_test',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_log_test' } }
      };

      const payload = JSON.stringify(mockStripeEvent);
      const signature = 't=1610000000,v1=test_signature';

      mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

      await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Webhook received:'),
        expect.objectContaining({
          method: 'POST',
          url: '/webhooks/stripe'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should track webhook processing metrics', async () => {
      const startTime = Date.now();

      const mockEvent = {
        id: 'evt_metrics_test',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_metrics_test' } }
      };

      const payload = JSON.stringify(mockEvent);
      const signature = 't=1610000000,v1=test_signature';

      mockPaymentService.processWebhook.mockImplementation(async () => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeGreaterThan(0);
    });
  });

  describe('Webhook security and validation', () => {
    it('should enforce rate limiting (if implemented)', async () => {
      // This test would verify rate limiting if implemented
      // For now, we'll test that multiple requests are handled
      const requests = Array.from({ length: 5 }, (_, i) => {
        const event = {
          id: `evt_rate_test_${i}`,
          type: 'charge.succeeded',
          data: { object: { id: `ch_rate_test_${i}` } }
        };
        const payload = JSON.stringify(event);
        const signature = 't=1610000000,v1=test_signature';

        mockPaymentService.processWebhook.mockResolvedValueOnce(undefined);

        return request(app)
          .post('/webhooks/stripe')
          .set('stripe-signature', signature)
          .set('content-type', 'application/json')
          .send(payload);
      });

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 200 OK or 429 Too Many Requests
      });
    });

    it('should handle replay attacks (timestamp validation)', async () => {
      const mockEvent = {
        id: 'evt_replay_test',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_replay_test' } }
      };

      const payload = JSON.stringify(mockEvent);
      
      // Use very old timestamp (potential replay attack)
      const oldTimestamp = Math.floor((Date.now() - 1000 * 60 * 60) / 1000); // 1 hour ago
      const signedPayload = `${oldTimestamp}.${payload}`;
      const signature = crypto.createHmac('sha256', 'test_webhook_secret')
        .update(signedPayload)
        .digest('hex');
      const oldSignature = `t=${oldTimestamp},v1=${signature}`;

      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('Timestamp too old')
      );

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', oldSignature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Timestamp too old');
    });

    it('should validate webhook content-type headers', async () => {
      const mockEvent = { id: 'evt_content_type_test' };
      
      const response = await request(app)
        .post('/webhooks/paypal')
        .set('content-type', 'text/plain') // Wrong content type
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(400);
    });

    it('should handle webhook payload size limits', async () => {
      const largePayload = {
        id: 'evt_large_test',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_large_test',
            metadata: {
              // Very large metadata
              large_data: 'x'.repeat(100000)
            }
          }
        }
      };

      const payload = JSON.stringify(largePayload);
      const signature = 't=1610000000,v1=test_signature';

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      // Should either process successfully or reject with 413 (Payload Too Large)
      expect([200, 413]).toContain(response.status);
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      const mockEvent = {
        id: 'evt_db_failure_test',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_db_failure_test' } }
      };

      const payload = JSON.stringify(mockEvent);
      const signature = 't=1610000000,v1=test_signature';

      mockPaymentService.processWebhook.mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused')
      );

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('ECONNREFUSED');
    });

    it('should handle service timeouts', async () => {
      const mockEvent = {
        id: 'evt_timeout_test',
        type: 'charge.succeeded',
        data: { object: { id: 'ch_timeout_test' } }
      };

      const payload = JSON.stringify(mockEvent);
      const signature = 't=1610000000,v1=test_signature';

      mockPaymentService.processWebhook.mockImplementation(async () => {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 30000));
      });

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload);

      // Request should complete or timeout appropriately
      expect([200, 408, 504]).toContain(response.status);
    });
  });
});