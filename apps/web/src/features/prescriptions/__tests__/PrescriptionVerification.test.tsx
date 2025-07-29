import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import PrescriptionVerification from '../components/PrescriptionVerification';
import { VerificationActionType } from '../types/verification.types';

// Mock the custom hook
vi.mock('../hooks/useOrderVerification', () => ({
  useOrderVerification: vi.fn()
}));

const mockUseOrderVerification = vi.mocked(
  () => import('../hooks/useOrderVerification').then(m => m.useOrderVerification)
);

// Test data
const mockOrder: PrescriptionOrder = {
  orderId: 'test-order-123',
  patientProfileId: 'patient-456',
  status: 'pending_verification',
  originalImageUrl: 'https://example.com/prescription.jpg',
  extractedText: 'Metformin 500mg, Take twice daily, Quantity: 30',
  ocrStatus: 'completed',
  ocrProcessedAt: new Date('2024-01-15T10:30:00Z'),
  medicationDetails: {
    name: 'Metformin',
    dosage: '500mg',
    quantity: 30
  },
  cost: 25.99,
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z')
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PrescriptionVerification', () => {
  const mockOnComplete = vi.fn();
  const mockOnError = vi.fn();
  const mockConfirmVerification = vi.fn();
  const mockSkipVerification = vi.fn();
  const mockClearErrors = vi.fn();

  const defaultHookReturn = {
    isLoading: false,
    isConfirming: false,
    isSkipping: false,
    errors: {},
    confirmVerification: mockConfirmVerification,
    skipVerification: mockSkipVerification,
    clearErrors: mockClearErrors
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrderVerification.mockReturnValue(defaultHookReturn);
  });

  const renderComponent = (order = mockOrder) => {
    return render(
      <TestWrapper>
        <PrescriptionVerification
          order={order}
          onComplete={mockOnComplete}
          onError={mockOnError}
        />
      </TestWrapper>
    );
  };

  describe('Component Rendering', () => {
    it('renders the main verification interface', () => {
      renderComponent();
      
      expect(screen.getByText('Review Prescription Details')).toBeInTheDocument();
      expect(screen.getByText('Original Prescription')).toBeInTheDocument();
      expect(screen.getByText('Medication Details')).toBeInTheDocument();
    });

    it('displays prescription image with correct src', () => {
      renderComponent();
      
      const image = screen.getByAltText('Prescription');
      expect(image).toHaveAttribute('src', mockOrder.originalImageUrl);
    });

    it('shows OCR extracted text when available', () => {
      renderComponent();
      
      expect(screen.getByText('OCR Extracted Text:')).toBeInTheDocument();
      expect(screen.getByText(`"${mockOrder.extractedText}"`)).toBeInTheDocument();
    });

    it('displays medication details in editable form fields', () => {
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      const dosageInput = screen.getByLabelText(/dosage/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      expect(nameInput).toHaveValue('Metformin');
      expect(dosageInput).toHaveValue('500mg');
      expect(quantityInput).toHaveValue(30);
    });

    it('shows confirm and skip action buttons', () => {
      renderComponent();
      
      expect(screen.getByRole('button', { name: /confirm details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip & send to pharmacist/i })).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates medication name when user types', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Lisinopril');
      
      expect(nameInput).toHaveValue('Lisinopril');
    });

    it('updates dosage when user types', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const dosageInput = screen.getByLabelText(/dosage/i);
      await user.clear(dosageInput);
      await user.type(dosageInput, '10mg');
      
      expect(dosageInput).toHaveValue('10mg');
    });

    it('updates quantity when user changes number', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '60');
      
      expect(quantityInput).toHaveValue(60);
    });

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup();
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        errors: { name: 'Name is required' }
      });
      
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      await user.type(nameInput, 'M');
      
      expect(mockClearErrors).toHaveBeenCalled();
    });
  });

  describe('Confirm Verification', () => {
    it('calls confirmVerification with current form data when confirm button clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Update form fields
      const nameInput = screen.getByLabelText(/medication name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Medicine');
      
      const confirmButton = screen.getByRole('button', { name: /confirm details/i });
      await user.click(confirmButton);
      
      expect(mockConfirmVerification).toHaveBeenCalledWith({
        name: 'Updated Medicine',
        dosage: '500mg',
        quantity: 30
      });
    });

    it('shows loading state during confirmation', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        isConfirming: true
      });
      
      renderComponent();
      
      const confirmButton = screen.getByRole('button', { name: /confirming/i });
      expect(confirmButton).toBeDisabled();
      expect(screen.getByText('Confirming...')).toBeInTheDocument();
    });
  });

  describe('Skip Verification', () => {
    it('calls skipVerification when skip button clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const skipButton = screen.getByRole('button', { name: /skip & send to pharmacist/i });
      await user.click(skipButton);
      
      expect(mockSkipVerification).toHaveBeenCalled();
    });

    it('shows loading state during skip', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        isSkipping: true
      });
      
      renderComponent();
      
      const skipButton = screen.getByRole('button', { name: /sending/i });
      expect(skipButton).toBeDisabled();
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays field-specific validation errors', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        errors: {
          name: 'Medication name is required',
          dosage: 'Dosage is required',
          quantity: 'Quantity must be greater than 0'
        }
      });
      
      renderComponent();
      
      expect(screen.getByText('Medication name is required')).toBeInTheDocument();
      expect(screen.getByText('Dosage is required')).toBeInTheDocument();
      expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
    });

    it('displays general error messages', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        errors: {
          general: 'Failed to confirm prescription details'
        }
      });
      
      renderComponent();
      
      expect(screen.getByText('Failed to confirm prescription details')).toBeInTheDocument();
    });

    it('applies error styling to invalid fields', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        errors: {
          name: 'Name is required'
        }
      });
      
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      expect(nameInput).toHaveClass('border-red-500');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      const dosageInput = screen.getByLabelText(/dosage/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      expect(nameInput).toHaveAttribute('id', 'medication-name');
      expect(dosageInput).toHaveAttribute('id', 'dosage');
      expect(quantityInput).toHaveAttribute('id', 'quantity');
    });

    it('disables form fields during loading states', () => {
      mockUseOrderVerification.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true
      });
      
      renderComponent();
      
      const nameInput = screen.getByLabelText(/medication name/i);
      const dosageInput = screen.getByLabelText(/dosage/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      expect(nameInput).toBeDisabled();
      expect(dosageInput).toBeDisabled();
      expect(quantityInput).toBeDisabled();
    });
  });

  describe('Image Error Handling', () => {
    it('handles image load errors gracefully', () => {
      renderComponent();
      
      const image = screen.getByAltText('Prescription');
      
      // Simulate image load error
      fireEvent.error(image);
      
      expect(image).toHaveAttribute('src', '/placeholder-prescription.png');
    });
  });

  describe('Empty/Missing Data Handling', () => {
    it('handles order without medication details', () => {
      const orderWithoutDetails = {
        ...mockOrder,
        medicationDetails: undefined
      };
      
      renderComponent(orderWithoutDetails);
      
      const nameInput = screen.getByLabelText(/medication name/i);
      const dosageInput = screen.getByLabelText(/dosage/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      expect(nameInput).toHaveValue('');
      expect(dosageInput).toHaveValue('');
      expect(quantityInput).toHaveValue(0);
    });

    it('handles order without OCR text', () => {
      const orderWithoutOCR = {
        ...mockOrder,
        extractedText: undefined
      };
      
      renderComponent(orderWithoutOCR);
      
      expect(screen.queryByText('OCR Extracted Text:')).not.toBeInTheDocument();
    });
  });
});