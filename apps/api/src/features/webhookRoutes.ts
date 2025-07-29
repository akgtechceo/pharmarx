import { Request, Response, Router } from 'express';
import { ApiResponse } from '@pharmarx/shared-types';
import { paymentService } from './paymentService';
import express from 'express';

const router = Router();

/**
 * Middleware to parse raw body for webhook signature verification
 */
const rawBodyParser = express.raw({ type: 'application/json' });

/**
 * POST /webhooks/stripe - Handle Stripe webhooks
 */
router.post('/webhooks/stripe', rawBodyParser, async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    if (!signature) {
      console.error('Missing Stripe signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing signature header'
      } as ApiResponse<null>);
    }

    // Parse JSON if needed
    let parsedPayload;
    try {
      parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (error) {
      console.error('Invalid JSON payload from Stripe');
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload'
      } as ApiResponse<null>);
    }

    // Process webhook through payment service
    await paymentService.processWebhook('stripe', parsedPayload, signature);

    // Log successful webhook processing
    console.log(`Stripe webhook processed successfully: ${parsedPayload.type}`);

    // Respond to Stripe
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    
    // Return 400 for client errors (invalid signature, malformed data)
    // Return 500 for server errors (database issues, etc.)
    const statusCode = error instanceof Error && 
      (error.message.includes('signature') || error.message.includes('Invalid')) ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    } as ApiResponse<null>);
  }
});

/**
 * POST /webhooks/paypal - Handle PayPal webhooks
 */
router.post('/webhooks/paypal', express.json(), async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const signature = req.headers['paypal-transmission-sig'] as string;

    if (!signature) {
      console.error('Missing PayPal signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing signature header'
      } as ApiResponse<null>);
    }

    // Validate required PayPal webhook fields
    if (!payload.event_type || !payload.resource) {
      console.error('Invalid PayPal webhook payload structure');
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload structure'
      } as ApiResponse<null>);
    }

    // Process webhook through payment service
    await paymentService.processWebhook('paypal', payload, signature);

    // Log successful webhook processing
    console.log(`PayPal webhook processed successfully: ${payload.event_type}`);

    // Respond to PayPal
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('PayPal webhook processing error:', error);
    
    const statusCode = error instanceof Error && 
      (error.message.includes('signature') || error.message.includes('Invalid')) ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    } as ApiResponse<null>);
  }
});

/**
 * POST /webhooks/mtn - Handle MTN Mobile Money webhooks
 */
router.post('/webhooks/mtn', express.json(), async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-mtn-signature'] as string;

    if (!signature) {
      console.error('Missing MTN signature header');
      return res.status(400).json({
        success: false,
        error: 'Missing signature header'
      } as ApiResponse<null>);
    }

    // Validate required MTN webhook fields
    if (!payload.transactionId || !payload.status) {
      console.error('Invalid MTN webhook payload structure');
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload structure'
      } as ApiResponse<null>);
    }

    // Process webhook through payment service
    await paymentService.processWebhook('mtn', payload, signature);

    // Log successful webhook processing
    console.log(`MTN webhook processed successfully: ${payload.transactionId} - ${payload.status}`);

    // Respond to MTN
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('MTN webhook processing error:', error);
    
    const statusCode = error instanceof Error && 
      (error.message.includes('signature') || error.message.includes('Invalid')) ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    } as ApiResponse<null>);
  }
});

/**
 * GET /webhooks/health - Health check endpoint for webhook services
 */
router.get('/webhooks/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      service: 'payment-webhooks',
      status: 'healthy',
      supportedGateways: ['stripe', 'paypal', 'mtn']
    },
    message: 'Webhook service is healthy'
  } as ApiResponse<{
    timestamp: string;
    service: string;
    status: string;
    supportedGateways: string[];
  }>);
});

/**
 * POST /webhooks/test - Test webhook endpoint for development/testing
 * This endpoint allows testing webhook processing without actual gateway calls
 */
router.post('/webhooks/test', express.json(), async (req: Request, res: Response) => {
  try {
    const { gateway, eventType, testData } = req.body;

    if (!gateway || !['stripe', 'paypal', 'mtn'].includes(gateway)) {
      return res.status(400).json({
        success: false,
        error: 'Valid gateway is required (stripe, paypal, mtn)'
      } as ApiResponse<null>);
    }

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      } as ApiResponse<null>);
    }

    // Create test webhook payload based on gateway
    let testPayload;
    switch (gateway) {
      case 'stripe':
        testPayload = {
          type: eventType,
          data: {
            object: {
              id: testData?.transactionId || `ch_test_${Date.now()}`,
              status: testData?.status || 'succeeded',
              amount: testData?.amount || 4550, // $45.50 in cents
              currency: testData?.currency || 'usd'
            }
          }
        };
        break;

      case 'paypal':
        testPayload = {
          event_type: eventType,
          resource: {
            id: testData?.transactionId || `PP_TEST_${Date.now()}`,
            status: testData?.status || 'COMPLETED',
            amount: {
              currency_code: testData?.currency || 'USD',
              value: testData?.amount || '45.50'
            }
          }
        };
        break;

      case 'mtn':
        testPayload = {
          transactionId: testData?.transactionId || `MTN_TEST_${Date.now()}`,
          status: testData?.status || 'SUCCESSFUL',
          amount: testData?.amount || 45.50,
          currency: testData?.currency || 'USD'
        };
        break;
    }

    // Process test webhook
    await paymentService.processWebhook(gateway, testPayload, 'test-signature');

    res.status(200).json({
      success: true,
      data: {
        gateway,
        eventType,
        testPayload,
        processedAt: new Date().toISOString()
      },
      message: 'Test webhook processed successfully'
    } as ApiResponse<{
      gateway: string;
      eventType: string;
      testPayload: any;
      processedAt: string;
    }>);

  } catch (error) {
    console.error('Test webhook error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test webhook processing failed'
    } as ApiResponse<null>);
  }
});

/**
 * Middleware to log all webhook requests for debugging
 */
router.use((req: Request, res: Response, next) => {
  console.log(`Webhook request: ${req.method} ${req.path}`, {
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'signature': req.headers['stripe-signature'] || 
                  req.headers['paypal-transmission-sig'] || 
                  req.headers['x-mtn-signature'] || 'none'
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });
  next();
});

export default router;