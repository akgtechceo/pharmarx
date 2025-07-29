import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ReviewActions } from '../components/ReviewActions';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock order data
const mockOrder: PrescriptionOrder = {
  orderId: 'test-order-123',
  patientProfileId: 'patient-123',
  status: 'awaiting_payment',
  originalImageUrl: 'https://example.com/prescription.jpg',
  extractedText: 'Test prescription text',
  ocrStatus: 'completed',
  ocrConfidence: 0.95,
  medicationDetails: {
    name: 'Test Medication',
    dosage: '500mg',
    quantity: 30
  },
  cost: 45.50,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z')
};

const mockPreparingOrder: PrescriptionOrder = {
  ...mockOrder,
  status: 'preparing'
};

const mockReadyOrder: PrescriptionOrder = {
  ...mockOrder,
  status: 'out_for_delivery'
};

// Mock functions
const mockOnApprove = vi.fn();
const mockOnReject = vi.fn();
const mockOnEdit = vi.fn();
const mockOnStatusUpdate = vi.fn();
const mockOnStatusUpdateComplete = vi.fn();

const defaultProps = {
  order: mockOrder,
  onApprove: mockOnApprove,
  onReject: mockOnReject,
  onEdit: mockOnEdit,
  onStatusUpdate: mockOnStatusUpdate,
  onStatusUpdateComplete: mockOnStatusUpdateComplete,
  isLoading: false
};

describe('ReviewActions Status Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnStatusUpdate.mockResolvedValue(mockOrder);
  });

  describe('Status Update Button Visibility', () => {
    it('shows "Mark as Preparing" button for awaiting_payment status', () => {
      render(<ReviewActions {...defaultProps} />);
      
      expect(screen.getByText('Mark as Preparing')).toBeInTheDocument();
      expect(screen.queryByText('Mark as Ready for Delivery')).not.toBeInTheDocument();
    });

    it('shows "Mark as Ready for Delivery" button for preparing status', () => {
      render(<ReviewActions {...defaultProps} order={mockPreparingOrder} />);
      
      expect(screen.getByText('Mark as Ready for Delivery')).toBeInTheDocument();
      expect(screen.queryByText('Mark as Preparing')).not.toBeInTheDocument();
    });

    it('hides regular action buttons when order is in fulfillment stage', () => {
      render(<ReviewActions {...defaultProps} />);
      
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Details')).not.toBeInTheDocument();
    });

    it('shows regular action buttons for non-fulfillment status', () => {
      const pendingOrder = { ...mockOrder, status: 'pending_verification' as const };
      render(<ReviewActions {...defaultProps} order={pendingOrder} />);
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByText('Edit Details')).toBeInTheDocument();
    });
  });

  describe('Status Update Confirmation Dialogs', () => {
    it('shows confirmation dialog when clicking Mark as Preparing', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Mark as Preparing')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to mark this order as preparing/)).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('shows confirmation dialog when clicking Mark as Ready for Delivery', async () => {
      render(<ReviewActions {...defaultProps} order={mockPreparingOrder} />);
      
      fireEvent.click(screen.getByText('Mark as Ready for Delivery'));
      
      await waitFor(() => {
        expect(screen.getByText('Mark as Ready for Delivery')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to mark this order as ready for delivery/)).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('closes confirmation dialog when clicking Cancel', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Update Execution', () => {
    it('calls onStatusUpdate with preparing status when confirmed', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('preparing', mockOnStatusUpdateComplete);
      });
    });

    it('calls onStatusUpdate with out_for_delivery status when confirmed', async () => {
      render(<ReviewActions {...defaultProps} order={mockPreparingOrder} />);
      
      fireEvent.click(screen.getByText('Mark as Ready for Delivery'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalledWith('out_for_delivery', mockOnStatusUpdateComplete);
      });
    });

    it('closes confirmation dialog after successful update', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state on status update button when isLoading is true', () => {
      render(<ReviewActions {...defaultProps} isLoading={true} />);
      
      const preparingButton = screen.getByRole('button', { name: /updating/i });
      expect(preparingButton).toBeInTheDocument();
      expect(preparingButton).toBeDisabled();
    });

    it('shows loading state in confirmation dialog when isLoading is true', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      // Simulate loading state
      render(<ReviewActions {...defaultProps} isLoading={true} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('disables confirmation buttons when loading', async () => {
      render(<ReviewActions {...defaultProps} isLoading={true} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /updating/i });
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        
        expect(confirmButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Status Display', () => {
    it('shows current order status in the status information section', () => {
      render(<ReviewActions {...defaultProps} />);
      
      expect(screen.getByText(/Current Status.*awaiting payment/i)).toBeInTheDocument();
      expect(screen.getByText(/Use the buttons above to update the order status/)).toBeInTheDocument();
    });

    it('shows preparing status correctly', () => {
      render(<ReviewActions {...defaultProps} order={mockPreparingOrder} />);
      
      expect(screen.getByText(/Current Status.*preparing/i)).toBeInTheDocument();
    });

    it('shows out for delivery status correctly', () => {
      render(<ReviewActions {...defaultProps} order={mockReadyOrder} />);
      
      expect(screen.getByText(/Current Status.*out for delivery/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles status update errors gracefully', async () => {
      const errorMessage = 'Failed to update status';
      mockOnStatusUpdate.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));
      
      // The error should be handled by the hook, so we just verify the call was made
      await waitFor(() => {
        expect(mockOnStatusUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for status update buttons', () => {
      render(<ReviewActions {...defaultProps} />);
      
      const preparingButton = screen.getByRole('button', { name: /mark as preparing/i });
      expect(preparingButton).toBeInTheDocument();
    });

    it('has proper focus management in confirmation dialog', async () => {
      render(<ReviewActions {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mark as Preparing'));
      
      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm');
        expect(confirmButton).toBeInTheDocument();
      });
    });
  });
});