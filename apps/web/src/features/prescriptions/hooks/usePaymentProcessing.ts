import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ProcessPaymentRequest, PaymentProcessingState, UsePaymentProcessingProps } from '../types/payment.types';

// Mock Payment Processing Service
class PaymentProcessingService {
  static async processStripePayment(request: ProcessPaymentRequest & { cardNumber: string; expiryDate: string; cvv: string; cardholderName: string }): Promise<{ paymentId: string; transactionId: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock validation
    if (!request.cardNumber || !request.expiryDate || !request.cvv || !request.cardholderName) {
      throw new Error('All card details are required');
    }
    
    // Mock card number validation (simple check)
    if (request.cardNumber.replace(/\s/g, '').length < 13) {
      throw new Error('Invalid card number');
    }
    
    // Mock success response
    return {
      paymentId: `stripe_${Date.now()}`,
      transactionId: `ch_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static async processPayPalPayment(request: ProcessPaymentRequest): Promise<{ paymentId: string; transactionId: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock PayPal processing
    return {
      paymentId: `paypal_${Date.now()}`,
      transactionId: `PP${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
  }

  static async processMTNPayment(request: ProcessPaymentRequest & { phoneNumber: string }): Promise<{ paymentId: string; transactionId: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock phone number validation
    if (!request.phoneNumber || request.phoneNumber.length < 8) {
      throw new Error('Valid phone number is required');
    }
    
    // Mock MTN Mobile Money response
    return {
      paymentId: `mtn_${Date.now()}`,
      transactionId: `MTN${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };
  }

  static async processPayment(request: ProcessPaymentRequest): Promise<{ paymentId: string; transactionId: string }> {
    switch (request.gateway) {
      case 'stripe':
        return this.processStripePayment(request as any);
      case 'paypal':
        return this.processPayPalPayment(request);
      case 'mtn':
        return this.processMTNPayment(request as any);
      default:
        throw new Error(`Unsupported payment gateway: ${request.gateway}`);
    }
  }
}

export const usePaymentProcessing = ({ orderId, onSuccess, onError }: UsePaymentProcessingProps) => {
  const [state, setState] = useState<PaymentProcessingState>({
    isProcessing: false,
    selectedGateway: undefined,
    error: undefined,
    success: false
  });

  // Payment processing mutation
  const paymentMutation = useMutation({
    mutationFn: (request: ProcessPaymentRequest) => PaymentProcessingService.processPayment(request),
    onMutate: (request) => {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        selectedGateway: request.gateway,
        error: undefined,
        success: false
      }));
    },
    onSuccess: (data, variables) => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        success: true,
        error: undefined
      }));
      onSuccess?.(data.paymentId, data.transactionId);
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        success: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
    }
  });

  const processPayment = useCallback(async (request: ProcessPaymentRequest) => {
    // Validate request
    if (!request.orderId || !request.gateway || !request.amount) {
      const error = 'Missing required payment information';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    // Additional gateway-specific validation
    if (request.gateway === 'stripe') {
      const stripeRequest = request as any;
      if (!stripeRequest.cardNumber || !stripeRequest.expiryDate || !stripeRequest.cvv || !stripeRequest.cardholderName) {
        const error = 'All card details are required for Stripe payments';
        setState(prev => ({ ...prev, error }));
        onError?.(error);
        return;
      }
    }

    if (request.gateway === 'mtn') {
      const mtnRequest = request as any;
      if (!mtnRequest.phoneNumber) {
        const error = 'Phone number is required for MTN Mobile Money payments';
        setState(prev => ({ ...prev, error }));
        onError?.(error);
        return;
      }
    }

    // Process payment
    paymentMutation.mutate(request);
  }, [paymentMutation, onError]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: undefined
    }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isProcessing: false,
      selectedGateway: undefined,
      error: undefined,
      success: false
    });
    paymentMutation.reset();
  }, [paymentMutation]);

  return {
    // State
    isProcessing: state.isProcessing || paymentMutation.isPending,
    error: state.error,
    success: state.success,
    selectedGateway: state.selectedGateway,
    
    // Actions
    processPayment,
    clearError,
    resetState,
    
    // Raw mutation for advanced usage
    paymentMutation
  };
};

// Helper hook for checking payment method availability
export const usePaymentMethodAvailability = (gateway: string) => {
  // In real implementation, this would check with backend for gateway availability
  const availabilityMap: Record<string, boolean> = {
    stripe: true,
    paypal: true,
    mtn: true
  };

  return {
    isAvailable: availabilityMap[gateway] || false,
    isLoading: false // Would be true while checking availability
  };
};

// Hook for payment validation
export const usePaymentValidation = () => {
  const validateStripeCard = useCallback((cardNumber: string, expiryDate: string, cvv: string, cardholderName: string) => {
    const errors: string[] = [];
    
    if (!cardholderName.trim()) {
      errors.push('Cardholder name is required');
    }
    
    if (!cardNumber.replace(/\s/g, '') || cardNumber.replace(/\s/g, '').length < 13) {
      errors.push('Invalid card number');
    }
    
    if (!expiryDate.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)) {
      errors.push('Invalid expiry date format (MM/YY)');
    }
    
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      errors.push('Invalid CVV');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const validateMTNPhone = useCallback((phoneNumber: string) => {
    const errors: string[] = [];
    
    if (!phoneNumber.trim()) {
      errors.push('Phone number is required');
    }
    
    // Basic phone number validation for Benin format
    const cleanedNumber = phoneNumber.replace(/\s/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 12) {
      errors.push('Invalid phone number format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    validateStripeCard,
    validateMTNPhone
  };
};