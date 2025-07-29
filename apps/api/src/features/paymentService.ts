import { Payment, PaymentGateway, PaymentStatus, PrescriptionOrder } from '@pharmarx/shared-types';
import { db } from './database';
import admin from 'firebase-admin';
import { receiptService } from './receiptService';

export interface ProcessPaymentRequest {
  orderId: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  paymentData: any; // Gateway-specific payment data
}

export interface ProcessPaymentResult {
  paymentId: string;
  transactionId: string;
  status: PaymentStatus;
  gatewayResponse?: any;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PaymentAuditLog {
  paymentId: string;
  orderId: string;
  action: string;
  timestamp: Date;
  gatewayResponse?: any;
  errorDetails?: string;
  userId?: string;
}

class PaymentService {
  private readonly collection = db.collection('payments');
  private readonly auditCollection = db.collection('paymentAuditLogs');
  private readonly ordersCollection = db.collection('prescriptionOrders');

  /**
   * Process payment for an order
   */
  async processPayment(request: ProcessPaymentRequest, userId?: string): Promise<ProcessPaymentResult> {
    // Validate order exists and is in correct state
    const orderValidation = await this.validateOrderForPayment(request.orderId);
    if (!orderValidation.isValid) {
      throw new Error(`Order validation failed: ${orderValidation.errors.join(', ')}`);
    }

    // Validate payment data
    const paymentValidation = this.validatePaymentData(request);
    if (!paymentValidation.isValid) {
      throw new Error(`Payment validation failed: ${paymentValidation.errors.join(', ')}`);
    }

    // Generate payment ID
    const paymentId = this.collection.doc().id;
    const timestamp = new Date();

    try {
      // Process payment with appropriate gateway
      let gatewayResponse: any;
      let transactionId: string;
      let status: PaymentStatus;

      switch (request.gateway) {
        case 'stripe':
          ({ transactionId, status, gatewayResponse } = await this.processStripePayment(request, paymentId));
          break;
        case 'paypal':
          ({ transactionId, status, gatewayResponse } = await this.processPayPalPayment(request, paymentId));
          break;
        case 'mtn':
          ({ transactionId, status, gatewayResponse } = await this.processMTNPayment(request, paymentId));
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${request.gateway}`);
      }

      // Create payment record
      const payment: Payment = {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        gateway: request.gateway,
        transactionId,
        status,
        receiptDetails: {}, // Will be populated when generating receipt
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Save payment to database
      await this.collection.doc(paymentId).set(payment);

      // Update order status if payment succeeded
      if (status === 'succeeded') {
        await this.updateOrderStatusToPaid(request.orderId);
        
        // Generate receipt for successful payment
        try {
          const orderDoc = await this.ordersCollection.doc(request.orderId).get();
          if (orderDoc.exists) {
            const order = orderDoc.data() as PrescriptionOrder;
            
            // Default pharmacy info (in real implementation, this would come from configuration)
            const pharmacyInfo = {
              name: 'PharmaRx - Pharmacie Moderne',
              address: '123 Avenue de la République, Cotonou, Bénin',
              phone: '+229 21 30 45 67',
              email: 'contact@pharmarx.bj',
              licenseNumber: 'PHM-BJ-2024-001',
              taxId: 'NIF-BJ-20240001234'
            };

            await receiptService.generateReceipt({
              payment,
              order,
              pharmacyInfo
            });
          }
        } catch (receiptError) {
          // Log receipt generation error but don't fail the payment
          console.error('Failed to generate receipt for payment:', paymentId, receiptError);
        }
      }

      // Log audit trail
      await this.logPaymentAudit({
        paymentId,
        orderId: request.orderId,
        action: 'payment_processed',
        timestamp,
        gatewayResponse,
        userId
      });

      return {
        paymentId,
        transactionId,
        status,
        gatewayResponse
      };

    } catch (error) {
      // Log error in audit trail
      await this.logPaymentAudit({
        paymentId,
        orderId: request.orderId,
        action: 'payment_failed',
        timestamp,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        userId
      });

      throw error;
    }
  }

  /**
   * Validate order can be paid
   */
  private async validateOrderForPayment(orderId: string): Promise<PaymentValidationResult> {
    const errors: string[] = [];

    try {
      const orderDoc = await this.ordersCollection.doc(orderId).get();
      
      if (!orderDoc.exists) {
        errors.push('Order not found');
        return { isValid: false, errors };
      }

      const order = orderDoc.data() as PrescriptionOrder;

      // Check order status
      if (order.status !== 'awaiting_payment') {
        errors.push(`Order is not ready for payment. Current status: ${order.status}`);
      }

      // Check if order already has a successful payment
      const existingPayments = await this.collection
        .where('orderId', '==', orderId)
        .where('status', '==', 'succeeded')
        .get();

      if (!existingPayments.empty) {
        errors.push('Order has already been paid');
      }

      // Validate cost is set
      if (!order.cost || order.cost <= 0) {
        errors.push('Order cost is not set or invalid');
      }

    } catch (error) {
      errors.push('Error validating order');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment data for gateway
   */
  private validatePaymentData(request: ProcessPaymentRequest): PaymentValidationResult {
    const errors: string[] = [];

    // Common validation
    if (!request.orderId) {
      errors.push('Order ID is required');
    }

    if (!request.amount || request.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!request.currency) {
      errors.push('Currency is required');
    }

    // Gateway-specific validation
    switch (request.gateway) {
      case 'stripe':
        if (!request.paymentData?.cardNumber || !request.paymentData?.expiryDate || 
            !request.paymentData?.cvv || !request.paymentData?.cardholderName) {
          errors.push('All card details are required for Stripe payments');
        }
        break;

      case 'mtn':
        if (!request.paymentData?.phoneNumber) {
          errors.push('Phone number is required for MTN Mobile Money');
        }
        break;

      // PayPal validation is minimal as it redirects to PayPal
      case 'paypal':
        break;

      default:
        errors.push(`Unsupported payment gateway: ${request.gateway}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(request: ProcessPaymentRequest, paymentId: string): Promise<{
    transactionId: string;
    status: PaymentStatus;
    gatewayResponse: any;
  }> {
    // In real implementation, this would use the Stripe SDK
    // For now, we'll simulate the payment processing
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock Stripe response
    const transactionId = `ch_${Math.random().toString(36).substr(2, 24)}`;
    
    // Simulate success/failure based on card number (for testing)
    const cardNumber = request.paymentData.cardNumber.replace(/\s/g, '');
    const shouldFail = cardNumber.endsWith('0000'); // Test failure case
    
    if (shouldFail) {
      throw new Error('Card declined by issuer');
    }

    const gatewayResponse = {
      id: transactionId,
      amount: request.amount * 100, // Stripe uses cents
      currency: request.currency.toLowerCase(),
      status: 'succeeded',
      payment_method: {
        card: {
          brand: 'visa',
          last4: cardNumber.slice(-4)
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    return {
      transactionId,
      status: 'succeeded',
      gatewayResponse
    };
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(request: ProcessPaymentRequest, paymentId: string): Promise<{
    transactionId: string;
    status: PaymentStatus;
    gatewayResponse: any;
  }> {
    // In real implementation, this would use PayPal SDK
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const transactionId = `PP${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
    
    const gatewayResponse = {
      id: transactionId,
      intent: 'CAPTURE',
      status: 'COMPLETED',
      purchase_units: [{
        amount: {
          currency_code: request.currency,
          value: request.amount.toString()
        }
      }],
      payer: {
        email_address: 'user@example.com',
        payer_id: 'PAYERID123'
      },
      create_time: new Date().toISOString()
    };

    return {
      transactionId,
      status: 'succeeded',
      gatewayResponse
    };
  }

  /**
   * Process MTN Mobile Money payment
   */
  private async processMTNPayment(request: ProcessPaymentRequest, paymentId: string): Promise<{
    transactionId: string;
    status: PaymentStatus;
    gatewayResponse: any;
  }> {
    // In real implementation, this would use MTN MoMo API
    
    // Simulate API delay (longer for mobile money)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const transactionId = `MTN${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
    
    // Simulate potential failure for testing
    const phoneNumber = request.paymentData.phoneNumber;
    const shouldFail = phoneNumber.includes('0000'); // Test failure case
    
    if (shouldFail) {
      throw new Error('Insufficient balance in mobile money account');
    }

    const gatewayResponse = {
      transactionId,
      status: 'SUCCESSFUL',
      amount: request.amount,
      currency: request.currency,
      externalTransactionId: `EXT${Math.random().toString(36).substr(2, 8)}`,
      payerMessage: 'Payment for prescription order',
      payeeNote: `Order ${request.orderId}`,
      financialTransactionId: `FIN${Math.random().toString(36).substr(2, 12)}`,
      reason: 'Payment completed successfully'
    };

    return {
      transactionId,
      status: 'succeeded',
      gatewayResponse
    };
  }

  /**
   * Update order status to paid
   */
  private async updateOrderStatusToPaid(orderId: string): Promise<void> {
    const orderRef = this.ordersCollection.doc(orderId);
    
    await orderRef.update({
      status: 'paid' as PrescriptionOrderStatus,
      updatedAt: new Date()
    });
  }

  /**
   * Log payment audit trail
   */
  private async logPaymentAudit(log: PaymentAuditLog): Promise<void> {
    const auditId = this.auditCollection.doc().id;
    await this.auditCollection.doc(auditId).set({
      ...log,
      auditId,
      createdAt: log.timestamp
    });
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    const doc = await this.collection.doc(paymentId).get();
    return doc.exists ? (doc.data() as Payment) : null;
  }

  /**
   * Get payments for an order
   */
  async getPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const snapshot = await this.collection
      .where('orderId', '==', orderId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as Payment);
  }

  /**
   * Get payment audit logs
   */
  async getPaymentAuditLogs(paymentId?: string, orderId?: string): Promise<PaymentAuditLog[]> {
    let query = this.auditCollection.orderBy('timestamp', 'desc');

    if (paymentId) {
      query = query.where('paymentId', '==', paymentId) as any;
    }

    if (orderId) {
      query = query.where('orderId', '==', orderId) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as PaymentAuditLog);
  }

  /**
   * Handle webhook verification and processing
   */
  async processWebhook(gateway: PaymentGateway, payload: any, signature?: string): Promise<void> {
    // Verify webhook signature (implementation varies by gateway)
    if (!this.verifyWebhookSignature(gateway, payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Process webhook based on gateway
    switch (gateway) {
      case 'stripe':
        await this.processStripeWebhook(payload);
        break;
      case 'paypal':
        await this.processPayPalWebhook(payload);
        break;
      case 'mtn':
        await this.processMTNWebhook(payload);
        break;
      default:
        throw new Error(`Unsupported webhook gateway: ${gateway}`);
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(gateway: PaymentGateway, payload: any, signature?: string): boolean {
    // In real implementation, each gateway has its own signature verification
    // For now, we'll just check that signature exists
    return !!signature;
  }

  /**
   * Process Stripe webhook
   */
  private async processStripeWebhook(payload: any): Promise<void> {
    const event = payload;
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Update payment status in database
        const paymentIntent = event.data.object;
        await this.updatePaymentStatusFromWebhook('stripe', paymentIntent.id, 'succeeded');
        break;
        
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        await this.updatePaymentStatusFromWebhook('stripe', failedIntent.id, 'failed');
        break;
    }
  }

  /**
   * Process PayPal webhook
   */
  private async processPayPalWebhook(payload: any): Promise<void> {
    const event = payload;
    
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        const captureId = event.resource.id;
        await this.updatePaymentStatusFromWebhook('paypal', captureId, 'succeeded');
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        const deniedCaptureId = event.resource.id;
        await this.updatePaymentStatusFromWebhook('paypal', deniedCaptureId, 'failed');
        break;
    }
  }

  /**
   * Process MTN webhook
   */
  private async processMTNWebhook(payload: any): Promise<void> {
    const transaction = payload;
    
    if (transaction.status === 'SUCCESSFUL') {
      await this.updatePaymentStatusFromWebhook('mtn', transaction.transactionId, 'succeeded');
    } else if (transaction.status === 'FAILED') {
      await this.updatePaymentStatusFromWebhook('mtn', transaction.transactionId, 'failed');
    }
  }

  /**
   * Update payment status from webhook
   */
  private async updatePaymentStatusFromWebhook(
    gateway: PaymentGateway, 
    transactionId: string, 
    status: PaymentStatus
  ): Promise<void> {
    // Find payment by transaction ID
    const snapshot = await this.collection
      .where('gateway', '==', gateway)
      .where('transactionId', '==', transactionId)
      .get();

    if (snapshot.empty) {
      throw new Error(`Payment not found for transaction ${transactionId}`);
    }

    const paymentDoc = snapshot.docs[0];
    const payment = paymentDoc.data() as Payment;

    // Update payment status
    await paymentDoc.ref.update({
      status,
      updatedAt: new Date()
    });

    // Update order status if payment succeeded
    if (status === 'succeeded' && payment.status !== 'succeeded') {
      await this.updateOrderStatusToPaid(payment.orderId);
    }

    // Log audit trail
    await this.logPaymentAudit({
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      action: `webhook_${status}`,
      timestamp: new Date(),
      gatewayResponse: { transactionId, status }
    });
  }
}

export const paymentService = new PaymentService();