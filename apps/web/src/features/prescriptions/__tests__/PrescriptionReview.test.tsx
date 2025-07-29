import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionReview } from '../components/PrescriptionReview';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock data
const mockOrder: PrescriptionOrder = {
  orderId: 'order-123456',
  patientProfileId: 'patient-abc123',
  status: 'awaiting_verification',
  originalImageUrl: 'https://example.com/prescription.jpg',
  extractedText: 'Amoxicillin 500mg\nTake 1 tablet twice daily\nQuantity: 30 tablets',
  ocrStatus: 'completed',
  ocrConfidence: 0.92,
  medicationDetails: {
    name: 'Amoxicillin',
    dosage: '500mg',
    quantity: 30
  },
  userVerified: true,
  userVerificationNotes: 'Patient confirmed all details are correct',
  createdAt: new Date('2025-01-15T10:30:00Z'),
  updatedAt: new Date('2025-01-15T10:35:00Z')
};

const mockOrderWithPharmacistReview: PrescriptionOrder = {
  ...mockOrder,
  pharmacistReview: {
    reviewedBy: 'pharmacist-456',
    reviewedAt: new Date('2025-01-15T11:00:00Z'),
    approved: true,
    pharmacistNotes: 'Prescription approved for dispensing',
    calculatedCost: 25.99
  }
};

const mockOrderUnverified: PrescriptionOrder = {
  ...mockOrder,
  userVerified: false,
  userVerificationNotes: undefined,
  ocrConfidence: 0.65
};

const mockProps = {
  order: mockOrder,
  onClose: vi.fn(),
  onActionComplete: vi.fn()
};

describe('PrescriptionReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the prescription review header with order information', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText(/Prescription Review - Order #order-12/)).toBeInTheDocument();
      expect(screen.getByText(/Patient ID: patient-a.../)).toBeInTheDocument();
      expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
    });

    it('renders the close button', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const closeButton = screen.getByLabelText('Close review');
      expect(closeButton).toBeInTheDocument();
    });

    it('renders the main content sections', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Original Prescription')).toBeInTheDocument();
      expect(screen.getByText('OCR Processing Results')).toBeInTheDocument();
      expect(screen.getByText('Medication Details')).toBeInTheDocument();
      expect(screen.getByText('Patient Verification Status')).toBeInTheDocument();
      expect(screen.getByText('Professional Review Checklist')).toBeInTheDocument();
    });
  });

  describe('Prescription Image Display', () => {
    it('displays the prescription image with correct src', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const image = screen.getByAltText('Original prescription');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockOrder.originalImageUrl);
    });

    it('shows loading state initially', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    it('handles image load error', async () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const image = screen.getByAltText('Original prescription');
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load prescription image')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('allows retrying image load after error', async () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const image = screen.getByAltText('Original prescription');
      fireEvent.error(image);
      
      await waitFor(() => {
        const retryButton = screen.getByText('Try again');
        fireEvent.click(retryButton);
        expect(screen.getByText('Loading image...')).toBeInTheDocument();
      });
    });
  });

  describe('OCR Information Display', () => {
    it('displays OCR status with correct styling', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const statusBadge = screen.getByText('completed');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('displays OCR confidence with correct color coding', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('High (92%)')).toBeInTheDocument();
      const confidenceText = screen.getByText('High (92%)');
      expect(confidenceText).toHaveClass('text-green-600');
    });

    it('displays medium confidence with yellow color', () => {
      const orderWithMediumConfidence = { ...mockOrder, ocrConfidence: 0.75 };
      render(<PrescriptionReview {...mockProps} order={orderWithMediumConfidence} />);
      
      const confidenceText = screen.getByText('Medium (75%)');
      expect(confidenceText).toHaveClass('text-yellow-600');
    });

    it('displays low confidence with red color', () => {
      render(<PrescriptionReview {...mockProps} order={mockOrderUnverified} />);
      
      const confidenceText = screen.getByText('Low (65%)');
      expect(confidenceText).toHaveClass('text-red-600');
    });

    it('displays extracted text when available', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Extracted Text:')).toBeInTheDocument();
      expect(screen.getByText(/Amoxicillin 500mg/)).toBeInTheDocument();
    });
  });

  describe('Medication Details Display', () => {
    it('displays medication information correctly', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
      expect(screen.getByText('500mg')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('handles missing medication details', () => {
      const orderWithoutMedication = { ...mockOrder, medicationDetails: undefined };
      render(<PrescriptionReview {...mockProps} order={orderWithoutMedication} />);
      
      const notExtractedTexts = screen.getAllByText('Not extracted');
      expect(notExtractedTexts).toHaveLength(3); // name, dosage, quantity
    });
  });

  describe('Patient Verification Status', () => {
    it('displays verified status with green indicator', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Verified')).toBeInTheDocument();
      const verifiedText = screen.getByText('Verified');
      expect(verifiedText).toHaveClass('text-green-600');
    });

    it('displays unverified status with yellow indicator', () => {
      render(<PrescriptionReview {...mockProps} order={mockOrderUnverified} />);
      
      expect(screen.getByText('Skipped Verification')).toBeInTheDocument();
      const skippedText = screen.getByText('Skipped Verification');
      expect(skippedText).toHaveClass('text-yellow-600');
    });

    it('displays patient verification notes when available', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Patient Notes:')).toBeInTheDocument();
      expect(screen.getByText('Patient confirmed all details are correct')).toBeInTheDocument();
    });

    it('hides patient notes section when not available', () => {
      render(<PrescriptionReview {...mockProps} order={mockOrderUnverified} />);
      
      expect(screen.queryByText('Patient Notes:')).not.toBeInTheDocument();
    });
  });

  describe('Professional Review Checklist', () => {
    it('renders all checklist items', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Prescription is legible and complete')).toBeInTheDocument();
      expect(screen.getByText('Medication name is correctly identified')).toBeInTheDocument();
      expect(screen.getByText('Dosage and quantity are appropriate')).toBeInTheDocument();
      expect(screen.getByText('No drug interactions or contraindications')).toBeInTheDocument();
      expect(screen.getByText('Patient information matches prescription')).toBeInTheDocument();
      expect(screen.getByText('Insurance coverage verified (if applicable)')).toBeInTheDocument();
    });

    it('renders checklist items as checkboxes', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(6);
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toHaveClass('text-blue-600');
      });
    });

    it('allows checking checklist items', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(firstCheckbox);
      
      expect(firstCheckbox).toBeChecked();
    });
  });

  describe('Previous Pharmacist Review', () => {
    it('displays previous review when available', () => {
      render(<PrescriptionReview {...mockProps} order={mockOrderWithPharmacistReview} />);
      
      expect(screen.getByText('Previous Review')).toBeInTheDocument();
      expect(screen.getByText('pharmacist-456')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Prescription approved for dispensing')).toBeInTheDocument();
    });

    it('displays rejected status correctly', () => {
      const rejectedOrder = {
        ...mockOrderWithPharmacistReview,
        pharmacistReview: {
          ...mockOrderWithPharmacistReview.pharmacistReview!,
          approved: false,
          rejectionReason: 'Unclear dosage information'
        }
      };
      
      render(<PrescriptionReview {...mockProps} order={rejectedOrder} />);
      
      const rejectedBadge = screen.getByText('Rejected');
      expect(rejectedBadge).toBeInTheDocument();
      expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('hides previous review section when not available', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.queryByText('Previous Review')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons Placeholder', () => {
    it('displays placeholder message for Task 3 actions', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText(/Review Actions:/)).toBeInTheDocument();
      expect(screen.getByText(/Approve, Reject, and Edit controls will be implemented in Task 3/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const closeButton = screen.getByLabelText('Close review');
      fireEvent.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly in various locations', () => {
      render(<PrescriptionReview {...mockProps} order={mockOrderWithPharmacistReview} />);
      
      // Check if dates are formatted (exact format may vary based on locale)
      expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
      expect(screen.getByText(/Date:/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      const closeButton = screen.getByLabelText('Close review');
      expect(closeButton).toBeInTheDocument();
      
      const image = screen.getByAltText('Original prescription');
      expect(image).toBeInTheDocument();
    });

    it('provides proper form labels for medication details', () => {
      render(<PrescriptionReview {...mockProps} />);
      
      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByText('Dosage')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles order with minimal data', () => {
      const minimalOrder: PrescriptionOrder = {
        orderId: 'minimal-order',
        patientProfileId: 'minimal-patient',
        status: 'awaiting_verification',
        originalImageUrl: 'https://example.com/minimal.jpg',
        createdAt: new Date()
      };
      
      render(<PrescriptionReview {...mockProps} order={minimalOrder} />);
      
      expect(screen.getByText(/Prescription Review - Order #minimal-/)).toBeInTheDocument();
      expect(screen.getByText('Not extracted')).toBeInTheDocument();
    });

    it('handles very long extracted text with scrolling', () => {
      const longTextOrder = {
        ...mockOrder,
        extractedText: 'This is a very long extracted text '.repeat(50)
      };
      
      render(<PrescriptionReview {...mockProps} order={longTextOrder} />);
      
      const extractedTextContainer = screen.getByText(/This is a very long extracted text/).parentElement;
      expect(extractedTextContainer).toHaveClass('max-h-32', 'overflow-y-auto');
    });
  });
});