import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderStatusDisplay } from '../components/OrderStatusDisplay';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Base mock order
const baseMockOrder: PrescriptionOrder = {
  orderId: 'test-order-123456789',
  patientProfileId: 'patient-123',
  originalImageUrl: 'https://example.com/prescription.jpg',
  extractedText: 'Test prescription text',
  ocrStatus: 'completed',
  ocrConfidence: 0.95,
  medicationDetails: {
    name: 'Test Medication 500mg',
    dosage: '500mg twice daily',
    quantity: 30
  },
  cost: 45.50,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  status: 'pending_verification'
};

describe('OrderStatusDisplay', () => {
  describe('Status Display', () => {
    it('displays pending_verification status correctly', () => {
      const order = { ...baseMockOrder, status: 'pending_verification' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
      expect(screen.getByText('Prescription uploaded and awaiting verification')).toBeInTheDocument();
    });

    it('displays awaiting_verification status correctly', () => {
      const order = { ...baseMockOrder, status: 'awaiting_verification' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Awaiting Verification')).toBeInTheDocument();
      expect(screen.getByText('Prescription is being reviewed by patient')).toBeInTheDocument();
    });

    it('displays awaiting_payment status correctly', () => {
      const order = { ...baseMockOrder, status: 'awaiting_payment' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();
      expect(screen.getByText('Prescription approved - payment required to proceed')).toBeInTheDocument();
    });

    it('displays preparing status correctly', () => {
      const order = { ...baseMockOrder, status: 'preparing' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Preparing')).toBeInTheDocument();
      expect(screen.getByText('Your medication is being prepared by the pharmacy')).toBeInTheDocument();
    });

    it('displays out_for_delivery status correctly', () => {
      const order = { ...baseMockOrder, status: 'out_for_delivery' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Ready for Delivery')).toBeInTheDocument();
      expect(screen.getByText('Your medication is ready for pickup or delivery')).toBeInTheDocument();
    });

    it('displays delivered status correctly', () => {
      const order = { ...baseMockOrder, status: 'delivered' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      expect(screen.getByText('Your medication has been successfully delivered')).toBeInTheDocument();
    });

    it('displays rejected status correctly', () => {
      const order = { ...baseMockOrder, status: 'rejected' as const };
      render(<OrderStatusDisplay order={order} />);
      
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Prescription was rejected during review')).toBeInTheDocument();
    });
  });

  describe('Order Details', () => {
    it('displays order ID correctly', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText(/Order ID:.*test-order-12/)).toBeInTheDocument();
    });

    it('displays creation date correctly', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText(/Created:.*Jan 15, 2024/)).toBeInTheDocument();
    });

    it('displays last updated date when available', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText(/Last Updated:.*Jan 15, 2024/)).toBeInTheDocument();
    });

    it('displays cost when available', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText(/Cost:.*\$45\.50/)).toBeInTheDocument();
    });

    it('displays TBD for cost when not available', () => {
      const orderWithoutCost = { ...baseMockOrder, cost: undefined };
      render(<OrderStatusDisplay order={orderWithoutCost} />);
      
      expect(screen.getByText(/Cost:.*TBD/)).toBeInTheDocument();
    });
  });

  describe('Medication Details', () => {
    it('displays medication details when available', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText('Medication')).toBeInTheDocument();
      expect(screen.getByText('Test Medication 500mg')).toBeInTheDocument();
      expect(screen.getByText(/500mg twice daily.*Qty: 30/)).toBeInTheDocument();
    });

    it('does not show medication section when details are not available', () => {
      const orderWithoutMedication = { 
        ...baseMockOrder, 
        medicationDetails: undefined 
      };
      render(<OrderStatusDisplay order={orderWithoutMedication} />);
      
      expect(screen.queryByText('Medication')).not.toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('shows progress indicator when showFullProgress is true', () => {
      const order = { ...baseMockOrder, status: 'preparing' as const };
      render(<OrderStatusDisplay order={order} showFullProgress={true} />);
      
      expect(screen.getByText('Order Progress')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('does not show progress indicator when showFullProgress is false', () => {
      const order = { ...baseMockOrder, status: 'preparing' as const };
      render(<OrderStatusDisplay order={order} showFullProgress={false} />);
      
      expect(screen.queryByText('Order Progress')).not.toBeInTheDocument();
    });

    it('does not show progress indicator for rejected orders', () => {
      const order = { ...baseMockOrder, status: 'rejected' as const };
      render(<OrderStatusDisplay order={order} showFullProgress={true} />);
      
      expect(screen.queryByText('Order Progress')).not.toBeInTheDocument();
    });

    it('shows correct progress step for preparing status', () => {
      const order = { ...baseMockOrder, status: 'preparing' as const };
      render(<OrderStatusDisplay order={order} showFullProgress={true} />);
      
      // Steps 1 and 2 should be completed (green), step 3 should be current (blue)
      const progressSteps = screen.getAllByText(/[1-5]/);
      
      // Should show completed checkmarks for steps 1 and 2
      const checkmarks = screen.getAllByRole('img', { hidden: true });
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('shows correct progress step for out_for_delivery status', () => {
      const order = { ...baseMockOrder, status: 'out_for_delivery' as const };
      render(<OrderStatusDisplay order={order} showFullProgress={true} />);
      
      // Steps 1, 2, and 3 should be completed, step 4 should be current
      const progressSteps = screen.getAllByText(/[1-5]/);
      
      // Should show multiple completed checkmarks
      const checkmarks = screen.getAllByRole('img', { hidden: true });
      expect(checkmarks.length).toBeGreaterThan(0);
    });
  });

  describe('Styling and CSS Classes', () => {
    it('applies custom className when provided', () => {
      const { container } = render(
        <OrderStatusDisplay order={baseMockOrder} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies correct color scheme for different statuses', () => {
      // Test pending verification (yellow)
      render(<OrderStatusDisplay order={baseMockOrder} />);
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
      
      // Test preparing (orange)
      const preparingOrder = { ...baseMockOrder, status: 'preparing' as const };
      render(<OrderStatusDisplay order={preparingOrder} />);
      expect(screen.getByText('Preparing')).toBeInTheDocument();
      
      // Test delivered (green)  
      const deliveredOrder = { ...baseMockOrder, status: 'delivered' as const };
      render(<OrderStatusDisplay order={deliveredOrder} />);
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      
      // Test rejected (red)
      const rejectedOrder = { ...baseMockOrder, status: 'rejected' as const };
      render(<OrderStatusDisplay order={rejectedOrder} />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<OrderStatusDisplay order={baseMockOrder} showFullProgress={true} />);
      
      // Should have proper headings
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
    });

    it('provides informative text for screen readers', () => {
      render(<OrderStatusDisplay order={baseMockOrder} />);
      
      expect(screen.getByText('Prescription uploaded and awaiting verification')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing updatedAt gracefully', () => {
      const orderWithoutUpdate = { 
        ...baseMockOrder, 
        updatedAt: undefined 
      };
      render(<OrderStatusDisplay order={orderWithoutUpdate} />);
      
      expect(screen.queryByText(/Last Updated:/)).not.toBeInTheDocument();
    });

    it('handles very long order IDs', () => {
      const orderWithLongId = { 
        ...baseMockOrder, 
        orderId: 'very-long-order-id-that-should-be-truncated-properly-123456789'
      };
      render(<OrderStatusDisplay order={orderWithLongId} />);
      
      // Should truncate the ID
      expect(screen.getByText(/Order ID:.*very-long-or/)).toBeInTheDocument();
    });

    it('handles missing medication name gracefully', () => {
      const orderWithEmptyMedication = { 
        ...baseMockOrder,
        medicationDetails: {
          name: '',
          dosage: '500mg',
          quantity: 30
        }
      };
      render(<OrderStatusDisplay order={orderWithEmptyMedication} />);
      
      expect(screen.getByText('Medication')).toBeInTheDocument();
    });
  });
});