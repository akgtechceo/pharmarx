import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentNotification } from '../components/PaymentNotification';
import { PaymentNotification as PaymentNotificationData } from '@pharmarx/shared-types';

describe('PaymentNotification', () => {
  const mockNotification: PaymentNotificationData = {
    orderId: 'test-order-1',
    status: 'awaiting_payment',
    calculatedCost: 45.50,
    medicationDetails: {
      name: 'Amoxicillin 500mg',
      dosage: '500mg, twice daily',
      quantity: 20
    },
    pharmacyInfo: {
      name: 'Central Pharmacy Cotonou',
      address: '123 Avenue de la République, Cotonou, Benin',
      phone: '+229 21 30 45 67'
    },
    estimatedDelivery: {
      timeframe: '2-3 business days',
      description: 'Delivery within Cotonou metropolitan area. Express delivery available for additional fee.'
    },
    approvedAt: new Date('2024-01-15T10:30:00Z')
  };

  const mockOnProceedToPayment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment notification with all required information', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    // Check header and status
    expect(screen.getByText('Order Approved - Payment Required')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Verified by Pharmacist')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();

    // Check medication details
    expect(screen.getByText('Prescription Details')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
    expect(screen.getByText('500mg, twice daily')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    // Check cost information
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
    expect(screen.getByText('$45.50')).toBeInTheDocument();
    expect(screen.getByText('Cost calculated and verified by licensed pharmacist')).toBeInTheDocument();

    // Check pharmacy information
    expect(screen.getByText('Pharmacy Details')).toBeInTheDocument();
    expect(screen.getByText('Central Pharmacy Cotonou')).toBeInTheDocument();
    expect(screen.getByText('123 Avenue de la République, Cotonou, Benin')).toBeInTheDocument();
    expect(screen.getByText('+229 21 30 45 67')).toBeInTheDocument();

    // Check delivery information
    expect(screen.getByText('Estimated Delivery')).toBeInTheDocument();
    expect(screen.getByText('2-3 business days')).toBeInTheDocument();
    expect(screen.getByText('Delivery within Cotonou metropolitan area. Express delivery available for additional fee.')).toBeInTheDocument();
  });

  it('renders with minimal notification data', () => {
    const minimalNotification: PaymentNotificationData = {
      orderId: 'test-order-2',
      status: 'awaiting_payment',
      calculatedCost: 25.00,
      approvedAt: new Date('2024-01-15T10:30:00Z')
    };

    render(
      <PaymentNotification
        notification={minimalNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    // Should still render basic elements
    expect(screen.getByText('Order Approved - Payment Required')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    
    // Optional sections should not be rendered
    expect(screen.queryByText('Central Pharmacy Cotonou')).not.toBeInTheDocument();
    expect(screen.queryByText('2-3 business days')).not.toBeInTheDocument();
  });

  it('handles notification without calculated cost', () => {
    const notificationWithoutCost: PaymentNotificationData = {
      ...mockNotification,
      calculatedCost: undefined
    };

    render(
      <PaymentNotification
        notification={notificationWithoutCost}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    expect(screen.getByText('TBD')).toBeInTheDocument();
    
    // Button should be disabled when no cost is available
    const proceedButton = screen.getByRole('button', { name: /proceed to payment/i });
    expect(proceedButton).toBeDisabled();
  });

  it('calls onProceedToPayment when button is clicked', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    const proceedButton = screen.getByRole('button', { name: /proceed to payment - \$45.50/i });
    expect(proceedButton).not.toBeDisabled();
    
    fireEvent.click(proceedButton);
    expect(mockOnProceedToPayment).toHaveBeenCalledTimes(1);
  });

  it('disables button and shows loading state when isLoading is true', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
        isLoading={true}
      />
    );

    const proceedButton = screen.getByRole('button', { name: /processing.../i });
    expect(proceedButton).toBeDisabled();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    // Date should be formatted in readable format
    expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    const notificationWithDifferentCost: PaymentNotificationData = {
      ...mockNotification,
      calculatedCost: 123.45
    };

    render(
      <PaymentNotification
        notification={notificationWithDifferentCost}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    expect(screen.getByText('$123.45')).toBeInTheDocument();
  });

  it('displays status transition indicators correctly', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    // Check for status transition visual elements
    const checkIcons = document.querySelectorAll('svg');
    expect(checkIcons.length).toBeGreaterThan(0);
    
    // Check for progress indicators
    expect(screen.getByText('Verified by Pharmacist')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();
  });

  it('handles missing medication details gracefully', () => {
    const notificationWithoutMedication: PaymentNotificationData = {
      ...mockNotification,
      medicationDetails: undefined
    };

    render(
      <PaymentNotification
        notification={notificationWithoutMedication}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    // Should not crash and should still render other content
    expect(screen.getByText('Order Approved - Payment Required')).toBeInTheDocument();
    expect(screen.getByText('Prescription Details')).toBeInTheDocument();
  });

  it('renders accessibility attributes correctly', () => {
    render(
      <PaymentNotification
        notification={mockNotification}
        onProceedToPayment={mockOnProceedToPayment}
      />
    );

    const proceedButton = screen.getByRole('button', { name: /proceed to payment/i });
    expect(proceedButton).toHaveAttribute('type', 'button');
    
    // Check for proper button states
    expect(proceedButton).not.toHaveAttribute('aria-disabled');
  });
});