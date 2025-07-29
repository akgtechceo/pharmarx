import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentGateway } from '../components/PaymentGateway';

// Mock the payment processing hook
vi.mock('../hooks/usePaymentProcessing', () => ({
  usePaymentProcessing: vi.fn(() => ({
    isProcessing: false,
    error: null,
    success: false,
    processPayment: vi.fn(),
    clearError: vi.fn(),
    resetState: vi.fn()
  }))
}));

const mockUsePaymentProcessing = vi.mocked(
  () => import('../hooks/usePaymentProcessing').then(m => m.usePaymentProcessing)
);

describe('PaymentGateway', () => {
  const defaultProps = {
    orderId: 'test-order-123',
    amount: 45.50,
    currency: 'USD',
    onPaymentSuccess: vi.fn(),
    onPaymentError: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment method selector initially', () => {
    render(<PaymentGateway {...defaultProps} />);

    expect(screen.getByText(/choisissez votre méthode de paiement/i)).toBeInTheDocument();
    expect(screen.getByText(/select your payment method/i)).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
  });

  it('displays order summary correctly', () => {
    render(<PaymentGateway {...defaultProps} />);

    expect(screen.getByText(/résumé de la commande/i)).toBeInTheDocument();
    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText('test-order-123')).toBeInTheDocument();
    expect(screen.getByText('$45.50')).toBeInTheDocument();
  });

  it('shows payment form when gateway is selected', async () => {
    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByText(/informations de carte/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/numéro de carte/i)).toBeInTheDocument();
    });
  });

  it('renders Stripe payment form with all required fields', async () => {
    render(<PaymentGateway {...defaultProps} />);

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/numéro de carte/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date d'expiration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nom du titulaire/i)).toBeInTheDocument();
    });
  });

  it('renders PayPal payment form with redirect information', async () => {
    render(<PaymentGateway {...defaultProps} />);

    const paypalButton = screen.getByRole('button', { name: /paypal/i });
    fireEvent.click(paypalButton);

    await waitFor(() => {
      expect(screen.getByText(/vous serez redirigé vers paypal/i)).toBeInTheDocument();
      expect(screen.getByText(/you will be redirected to paypal/i)).toBeInTheDocument();
    });
  });

  it('renders MTN payment form with phone number field', async () => {
    render(<PaymentGateway {...defaultProps} />);

    const mtnButton = screen.getByRole('button', { name: /mtn mobile money/i });
    fireEvent.click(mtnButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/numéro de téléphone/i)).toBeInTheDocument();
      expect(screen.getByText(/format: \+229 xx xx xx xx/i)).toBeInTheDocument();
    });
  });

  it('shows back button when payment form is displayed', async () => {
    render(<PaymentGateway {...defaultProps} />);

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByText(/retour/i)).toBeInTheDocument();
    });
  });

  it('returns to method selector when back button is clicked', async () => {
    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByText(/informations de carte/i)).toBeInTheDocument();
    });

    // Click back
    const backButton = screen.getByText(/retour/i);
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText(/choisissez votre méthode de paiement/i)).toBeInTheDocument();
    });
  });

  it('processes Stripe payment with correct data', async () => {
    const mockProcessPayment = vi.fn();
    const usePaymentProcessingMock = vi.fn(() => ({
      isProcessing: false,
      error: null,
      success: false,
      processPayment: mockProcessPayment,
      clearError: vi.fn(),
      resetState: vi.fn()
    }));

    // Mock the hook
    vi.doMock('../hooks/usePaymentProcessing', () => ({
      usePaymentProcessing: usePaymentProcessingMock
    }));

    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/numéro de carte/i)).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/numéro de carte/i), {
      target: { value: '4242424242424242' }
    });
    fireEvent.change(screen.getByLabelText(/date d'expiration/i), {
      target: { value: '12/25' }
    });
    fireEvent.change(screen.getByLabelText(/cvv/i), {
      target: { value: '123' }
    });
    fireEvent.change(screen.getByLabelText(/nom du titulaire/i), {
      target: { value: 'John Doe' }
    });

    // Submit payment
    const payButton = screen.getByRole('button', { name: /payer/i });
    fireEvent.click(payButton);

    expect(mockProcessPayment).toHaveBeenCalledWith({
      orderId: 'test-order-123',
      gateway: 'stripe',
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      }
    });
  });

  it('processes MTN payment with phone number', async () => {
    const mockProcessPayment = vi.fn();
    const usePaymentProcessingMock = vi.fn(() => ({
      isProcessing: false,
      error: null,
      success: false,
      processPayment: mockProcessPayment,
      clearError: vi.fn(),
      resetState: vi.fn()
    }));

    vi.doMock('../hooks/usePaymentProcessing', () => ({
      usePaymentProcessing: usePaymentProcessingMock
    }));

    render(<PaymentGateway {...defaultProps} />);

    // Select MTN
    const mtnButton = screen.getByRole('button', { name: /mtn mobile money/i });
    fireEvent.click(mtnButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/numéro de téléphone/i)).toBeInTheDocument();
    });

    // Fill phone number
    fireEvent.change(screen.getByLabelText(/numéro de téléphone/i), {
      target: { value: '+22912345678' }
    });

    // Submit payment
    const payButton = screen.getByRole('button', { name: /payer/i });
    fireEvent.click(payButton);

    expect(mockProcessPayment).toHaveBeenCalledWith({
      orderId: 'test-order-123',
      gateway: 'mtn',
      amount: 45.50,
      currency: 'USD',
      paymentData: {
        phoneNumber: '+22912345678'
      }
    });
  });

  it('shows loading state during payment processing', async () => {
    const usePaymentProcessingMock = vi.fn(() => ({
      isProcessing: true,
      error: null,
      success: false,
      processPayment: vi.fn(),
      clearError: vi.fn(),
      resetState: vi.fn()
    }));

    vi.doMock('../hooks/usePaymentProcessing', () => ({
      usePaymentProcessing: usePaymentProcessingMock
    }));

    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      const payButton = screen.getByRole('button', { name: /traitement en cours/i });
      expect(payButton).toBeDisabled();
    });
  });

  it('displays payment errors', async () => {
    const usePaymentProcessingMock = vi.fn(() => ({
      isProcessing: false,
      error: 'Card declined by issuer',
      success: false,
      processPayment: vi.fn(),
      clearError: vi.fn(),
      resetState: vi.fn()
    }));

    vi.doMock('../hooks/usePaymentProcessing', () => ({
      usePaymentProcessing: usePaymentProcessingMock
    }));

    render(<PaymentGateway {...defaultProps} />);

    expect(screen.getByText('Card declined by issuer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('calls onPaymentSuccess when payment succeeds', async () => {
    const usePaymentProcessingMock = vi.fn(() => ({
      isProcessing: false,
      error: null,
      success: true,
      processPayment: vi.fn(),
      clearError: vi.fn(),
      resetState: vi.fn()
    }));

    vi.doMock('../hooks/usePaymentProcessing', () => ({
      usePaymentProcessing: usePaymentProcessingMock
    }));

    render(<PaymentGateway {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.onPaymentSuccess).toHaveBeenCalledWith('test-order-123');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<PaymentGateway {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('validates required fields before submission', async () => {
    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/numéro de carte/i)).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const payButton = screen.getByRole('button', { name: /payer/i });
    fireEvent.click(payButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/veuillez remplir tous les champs requis/i)).toBeInTheDocument();
    });
  });

  it('formats currency correctly for different currencies', () => {
    const { rerender } = render(<PaymentGateway {...defaultProps} />);

    expect(screen.getByText('$45.50')).toBeInTheDocument();

    // Test XOF currency
    rerender(<PaymentGateway {...defaultProps} currency="XOF" amount={27300} />);

    expect(screen.getByText('27 300 FCFA')).toBeInTheDocument();
  });

  it('shows security indicators', () => {
    render(<PaymentGateway {...defaultProps} />);

    expect(screen.getByText(/paiement sécurisé/i)).toBeInTheDocument();
    expect(screen.getByText(/secure payment/i)).toBeInTheDocument();
  });

  it('handles form reset on gateway change', async () => {
    render(<PaymentGateway {...defaultProps} />);

    // Select Stripe and fill form
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      const cardInput = screen.getByLabelText(/numéro de carte/i);
      fireEvent.change(cardInput, { target: { value: '4242424242424242' } });
      expect(cardInput).toHaveValue('4242424242424242');
    });

    // Go back and select different method
    const backButton = screen.getByText(/retour/i);
    fireEvent.click(backButton);

    const mtnButton = screen.getByRole('button', { name: /mtn mobile money/i });
    fireEvent.click(mtnButton);

    // Go back to Stripe - form should be reset
    fireEvent.click(backButton);
    fireEvent.click(stripeButton);

    await waitFor(() => {
      const cardInput = screen.getByLabelText(/numéro de carte/i);
      expect(cardInput).toHaveValue('');
    });
  });

  it('maintains accessibility standards', async () => {
    render(<PaymentGateway {...defaultProps} />);

    // Check for proper labels
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Select a payment method to check form accessibility
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      // All form inputs should have labels
      const cardInput = screen.getByLabelText(/numéro de carte/i);
      const expiryInput = screen.getByLabelText(/date d'expiration/i);
      const cvvInput = screen.getByLabelText(/cvv/i);
      const nameInput = screen.getByLabelText(/nom du titulaire/i);

      expect(cardInput).toBeInTheDocument();
      expect(expiryInput).toBeInTheDocument();
      expect(cvvInput).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();

      // Inputs should have required attributes
      expect(cardInput).toBeRequired();
      expect(expiryInput).toBeRequired();
      expect(cvvInput).toBeRequired();
      expect(nameInput).toBeRequired();
    });
  });
});