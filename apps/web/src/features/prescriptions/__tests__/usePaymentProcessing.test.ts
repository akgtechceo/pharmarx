import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaymentProcessing, usePaymentMethodAvailability, usePaymentValidation } from '../hooks/usePaymentProcessing';

// Mock the API service
const mockProcessStripePayment = vi.fn();
const mockProcessPayPalPayment = vi.fn();
const mockProcessMTNPayment = vi.fn();

vi.mock('../hooks/usePaymentProcessing', async () => {
  const actual = await vi.importActual('../hooks/usePaymentProcessing');
  return {
    ...actual,
    PaymentProcessingService: {
      processStripePayment: mockProcessStripePayment,
      processPayPalPayment: mockProcessPayPalPayment,
      processMTNPayment: mockProcessMTNPayment
    }
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePaymentProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }), { wrapper: createWrapper() });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(false);
    expect(result.current.selectedGateway).toBeUndefined();
    expect(typeof result.current.processPayment).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.resetState).toBe('function');
  });

  it('processes Stripe payment successfully', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockProcessStripePayment.mockResolvedValueOnce({
      paymentId: 'payment-123',
      transactionId: 'ch_test123',
      status: 'succeeded'
    });

    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess,
      onError
    }), { wrapper: createWrapper() });

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    result.current.processPayment(paymentData);

    expect(result.current.isProcessing).toBe(true);

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    expect(onSuccess).toHaveBeenCalledWith('payment-123');
  });

  it('processes PayPal payment successfully', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockProcessPayPalPayment.mockResolvedValueOnce({
      paymentId: 'payment-456',
      transactionId: 'PP_TEST123',
      status: 'succeeded'
    });

    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess,
      onError
    }), { wrapper: createWrapper() });

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'paypal' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {}
    };

    result.current.processPayment(paymentData);

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith('payment-456');
  });

  it('processes MTN payment successfully', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockProcessMTNPayment.mockResolvedValueOnce({
      paymentId: 'payment-789',
      transactionId: 'MTN_TEST123',
      status: 'succeeded'
    });

    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess,
      onError
    }), { wrapper: createWrapper() });

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'mtn' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        phoneNumber: '+22912345678'
      }
    };

    result.current.processPayment(paymentData);

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith('payment-789');
  });

  it('handles payment failure', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    mockProcessStripePayment.mockRejectedValueOnce(new Error('Card declined'));

    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess,
      onError
    }), { wrapper: createWrapper() });

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4000000000000002', // Declined card
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    result.current.processPayment(paymentData);

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe('Card declined');
    });

    expect(onError).toHaveBeenCalledWith('Card declined');
  });

  it('validates payment data before processing', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess,
      onError
    }), { wrapper: createWrapper() });

    // Invalid Stripe payment data (missing CVV)
    const invalidPaymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cardholderName: 'John Doe'
        // Missing CVV
      }
    };

    result.current.processPayment(invalidPaymentData);

    await waitFor(() => {
      expect(result.current.error).toContain('required');
      expect(result.current.success).toBe(false);
    });

    expect(mockProcessStripePayment).not.toHaveBeenCalled();
  });

  it('clears error state', async () => {
    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }), { wrapper: createWrapper() });

    // Simulate error state
    mockProcessStripePayment.mockRejectedValueOnce(new Error('Test error'));

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    result.current.processPayment(paymentData);

    await waitFor(() => {
      expect(result.current.error).toBe('Test error');
    });

    // Clear error
    result.current.clearError();

    expect(result.current.error).toBeNull();
  });

  it('resets state', async () => {
    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }), { wrapper: createWrapper() });

    // Simulate successful payment
    mockProcessStripePayment.mockResolvedValueOnce({
      paymentId: 'payment-123',
      transactionId: 'ch_test123',
      status: 'succeeded'
    });

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    result.current.processPayment(paymentData);

    await waitFor(() => {
      expect(result.current.success).toBe(true);
    });

    // Reset state
    result.current.resetState();

    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedGateway).toBeUndefined();
  });

  it('tracks selected gateway', async () => {
    const { result } = renderHook(() => usePaymentProcessing({
      orderId: 'test-order-1',
      onSuccess: vi.fn(),
      onError: vi.fn()
    }), { wrapper: createWrapper() });

    expect(result.current.selectedGateway).toBeUndefined();

    const paymentData = {
      orderId: 'test-order-1',
      gateway: 'stripe' as const,
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    };

    result.current.processPayment(paymentData);

    expect(result.current.selectedGateway).toBe('stripe');
  });
});

describe('usePaymentMethodAvailability', () => {
  it('returns availability for all payment methods', () => {
    const { result } = renderHook(() => usePaymentMethodAvailability());

    expect(result.current.stripe).toBe(true);
    expect(result.current.paypal).toBe(true);
    expect(result.current.mtn).toBe(true);
  });

  it('handles regional availability (future enhancement)', () => {
    const { result } = renderHook(() => usePaymentMethodAvailability('BJ')); // Benin

    // All methods should be available in Benin
    expect(result.current.stripe).toBe(true);
    expect(result.current.paypal).toBe(true);
    expect(result.current.mtn).toBe(true);
  });
});

describe('usePaymentValidation', () => {
  it('validates Stripe card details correctly', () => {
    const { result } = renderHook(() => usePaymentValidation());

    // Valid card
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(true);

    // Invalid card number
    expect(result.current.validateStripeCard({
      cardNumber: '1234',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(false);

    // Missing fields
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: ''
    })).toBe(false);

    // Invalid expiry
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/20', // Past date
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(false);

    // Invalid CVV
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/25',
      cvv: '12', // Too short
      cardholderName: 'John Doe'
    })).toBe(false);
  });

  it('validates MTN phone numbers correctly', () => {
    const { result } = renderHook(() => usePaymentValidation());

    // Valid Benin MTN numbers
    expect(result.current.validateMTNPhone('+22996123456')).toBe(true);
    expect(result.current.validateMTNPhone('+22997123456')).toBe(true);
    expect(result.current.validateMTNPhone('96123456')).toBe(true);

    // Invalid numbers
    expect(result.current.validateMTNPhone('+22995123456')).toBe(false); // Wrong prefix
    expect(result.current.validateMTNPhone('+229961234')).toBe(false); // Too short
    expect(result.current.validateMTNPhone('+2299612345678')).toBe(false); // Too long
    expect(result.current.validateMTNPhone('')).toBe(false); // Empty
    expect(result.current.validateMTNPhone('invalid')).toBe(false); // Non-numeric
  });

  it('validates card expiry dates', () => {
    const { result } = renderHook(() => usePaymentValidation());

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Future dates should be valid
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: `12/${currentYear + 1}`,
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(true);

    // Current month/year should be valid
    const currentMonthStr = currentMonth.toString().padStart(2, '0');
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: `${currentMonthStr}/${currentYear}`,
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(true);

    // Past dates should be invalid
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '01/20',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(false);
  });

  it('validates different card types', () => {
    const { result } = renderHook(() => usePaymentValidation());

    // Visa
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(true);

    // Mastercard
    expect(result.current.validateStripeCard({
      cardNumber: '5555555555554444',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(true);

    // American Express (4-digit CVV)
    expect(result.current.validateStripeCard({
      cardNumber: '378282246310005',
      expiryDate: '12/25',
      cvv: '1234',
      cardholderName: 'John Doe'
    })).toBe(true);

    // Invalid card number (fails Luhn algorithm)
    expect(result.current.validateStripeCard({
      cardNumber: '4242424242424243',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe'
    })).toBe(false);
  });

  it('handles edge cases in validation', () => {
    const { result } = renderHook(() => usePaymentValidation());

    // Empty/null inputs
    expect(result.current.validateStripeCard({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: ''
    })).toBe(false);

    expect(result.current.validateMTNPhone('')).toBe(false);

    // Whitespace handling
    expect(result.current.validateStripeCard({
      cardNumber: ' 4242 4242 4242 4242 ',
      expiryDate: ' 12/25 ',
      cvv: ' 123 ',
      cardholderName: ' John Doe '
    })).toBe(true);

    // Special characters in phone number
    expect(result.current.validateMTNPhone('+229-96-12-34-56')).toBe(false);
    expect(result.current.validateMTNPhone('+229 96 12 34 56')).toBe(false);
  });
});