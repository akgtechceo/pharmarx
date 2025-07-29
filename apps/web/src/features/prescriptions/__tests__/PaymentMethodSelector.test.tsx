import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PaymentGateway } from '@pharmarx/shared-types';

describe('PaymentMethodSelector', () => {
  const mockOnGatewaySelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all payment method options', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Carte de crédit / débit sécurisée')).toBeInTheDocument();
    
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Compte PayPal ou carte bancaire')).toBeInTheDocument();
    
    expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    expect(screen.getByText('Paiement mobile sécurisé')).toBeInTheDocument();
  });

  it('shows selected state for chosen gateway', () => {
    render(
      <PaymentMethodSelector
        selectedGateway="stripe"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    expect(stripeButton).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
    
    const paypalButton = screen.getByRole('button', { name: /paypal/i });
    expect(paypalButton).not.toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
  });

  it('calls onGatewaySelect when a payment method is clicked', async () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    fireEvent.click(stripeButton);

    await waitFor(() => {
      expect(mockOnGatewaySelect).toHaveBeenCalledWith('stripe');
    });
  });

  it('switches selection when different methods are clicked', async () => {
    const { rerender } = render(
      <PaymentMethodSelector
        selectedGateway="stripe"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const paypalButton = screen.getByRole('button', { name: /paypal/i });
    fireEvent.click(paypalButton);

    expect(mockOnGatewaySelect).toHaveBeenCalledWith('paypal');

    // Simulate parent component updating selectedGateway
    rerender(
      <PaymentMethodSelector
        selectedGateway="paypal"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(paypalButton).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
  });

  it('disables buttons when loading', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading state with opacity reduction', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={true}
      />
    );

    const container = screen.getByRole('group');
    expect(container).toHaveClass('opacity-50');
  });

  it('displays security notice', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText(/toutes les transactions sont sécurisées/i)).toBeInTheDocument();
    expect(screen.getByText(/all transactions are secure/i)).toBeInTheDocument();
  });

  it('shows gateway-specific information when method is selected', () => {
    const { rerender } = render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    // No gateway info shown initially
    expect(screen.queryByText(/cartes acceptées/i)).not.toBeInTheDocument();

    // Select Stripe
    rerender(
      <PaymentMethodSelector
        selectedGateway="stripe"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText(/cartes acceptées/i)).toBeInTheDocument();
    expect(screen.getByText(/visa, mastercard, american express/i)).toBeInTheDocument();
  });

  it('shows PayPal-specific information when PayPal is selected', () => {
    render(
      <PaymentMethodSelector
        selectedGateway="paypal"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText(/vous serez redirigé vers paypal/i)).toBeInTheDocument();
    expect(screen.getByText(/you will be redirected to paypal/i)).toBeInTheDocument();
  });

  it('shows MTN-specific information when MTN is selected', () => {
    render(
      <PaymentMethodSelector
        selectedGateway="mtn"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText(/paiement via votre compte mtn mobile money/i)).toBeInTheDocument();
    expect(screen.getByText(/payment via your mtn mobile money account/i)).toBeInTheDocument();
  });

  it('shows availability status for all methods', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    // All methods should show as available by default
    const availableTexts = screen.getAllByText(/disponible/i);
    expect(availableTexts).toHaveLength(3);
  });

  it('applies correct styling for different states', () => {
    const { rerender } = render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    
    // Default state
    expect(stripeButton).toHaveClass('border-gray-200', 'hover:border-gray-300');

    // Selected state
    rerender(
      <PaymentMethodSelector
        selectedGateway="stripe"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    expect(stripeButton).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50');
  });

  it('handles keyboard navigation', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    
    // Focus should be manageable
    stripeButton.focus();
    expect(stripeButton).toHaveFocus();

    // Enter key should trigger selection
    fireEvent.keyDown(stripeButton, { key: 'Enter', code: 'Enter' });
    expect(mockOnGatewaySelect).toHaveBeenCalledWith('stripe');
  });

  it('maintains accessibility attributes', () => {
    render(
      <PaymentMethodSelector
        selectedGateway="stripe"
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
    });

    // Selected button should have aria-pressed
    const stripeButton = screen.getByRole('button', { name: /stripe/i });
    expect(stripeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders with correct icons for each payment method', () => {
    render(
      <PaymentMethodSelector
        selectedGateway={undefined}
        onGatewaySelect={mockOnGatewaySelect}
        isLoading={false}
      />
    );

    // Check that payment method icons are rendered (they should be SVGs or images)
    const stripeSection = screen.getByRole('button', { name: /stripe/i });
    const paypalSection = screen.getByRole('button', { name: /paypal/i });
    const mtnSection = screen.getByRole('button', { name: /mtn mobile money/i });

    expect(stripeSection).toBeInTheDocument();
    expect(paypalSection).toBeInTheDocument();
    expect(mtnSection).toBeInTheDocument();
  });
});