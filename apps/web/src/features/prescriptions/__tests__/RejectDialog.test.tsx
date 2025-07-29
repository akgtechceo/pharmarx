import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RejectDialog } from '../components/RejectDialog';

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  isLoading: false
};

describe('RejectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<RejectDialog {...mockProps} />);
      
      expect(screen.getByText('Reject Prescription')).toBeInTheDocument();
      expect(screen.getByText('Reason for Rejection')).toBeInTheDocument();
      expect(screen.getByText('Additional Notes')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<RejectDialog {...mockProps} isOpen={false} />);
      
      expect(screen.queryByText('Reject Prescription')).not.toBeInTheDocument();
    });

    it('renders all rejection reason options', () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByDisplayValue('');
      fireEvent.click(reasonSelect);
      
      expect(screen.getByText('Illegible prescription')).toBeInTheDocument();
      expect(screen.getByText('Incomplete medication information')).toBeInTheDocument();
      expect(screen.getByText('Unclear dosage instructions')).toBeInTheDocument();
      expect(screen.getByText('Patient information mismatch')).toBeInTheDocument();
      expect(screen.getByText('Drug interaction concerns')).toBeInTheDocument();
      expect(screen.getByText('Invalid prescription format')).toBeInTheDocument();
      expect(screen.getByText('Expired prescription')).toBeInTheDocument();
      expect(screen.getByText('Insurance coverage issues')).toBeInTheDocument();
      expect(screen.getByText('Other (specify in notes)')).toBeInTheDocument();
    });

    it('renders warning message', () => {
      render(<RejectDialog {...mockProps} />);
      
      expect(screen.getByText('Rejection Notice')).toBeInTheDocument();
      expect(screen.getByText(/This action will reject the prescription and notify the patient/)).toBeInTheDocument();
    });

    it('renders form controls', () => {
      render(<RejectDialog {...mockProps} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Reason dropdown
      expect(screen.getByRole('textbox')).toBeInTheDocument(); // Notes textarea
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject prescription/i })).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows selecting a rejection reason', () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      
      expect(reasonSelect).toHaveValue('Illegible prescription');
    });

    it('allows typing in notes field', () => {
      render(<RejectDialog {...mockProps} />);
      
      const notesTextarea = screen.getByRole('textbox');
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
      
      expect(notesTextarea).toHaveValue('Test notes');
    });

    it('shows required indicator for notes when "Other" is selected', () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Other (specify in notes)' } });
      
      expect(screen.getByText(/Additional Notes \*/)).toBeInTheDocument();
    });

    it('clears form when dialog opens', async () => {
      const { rerender } = render(<RejectDialog {...mockProps} isOpen={false} />);
      
      // Open dialog and fill form
      rerender(<RejectDialog {...mockProps} isOpen={true} />);
      
      const reasonSelect = screen.getByRole('combobox');
      const notesTextarea = screen.getByRole('textbox');
      
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
      
      // Close and reopen dialog
      rerender(<RejectDialog {...mockProps} isOpen={false} />);
      rerender(<RejectDialog {...mockProps} isOpen={true} />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveValue('');
        expect(screen.getByRole('textbox')).toHaveValue('');
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when no reason is selected', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a rejection reason')).toBeInTheDocument();
      });

      expect(mockProps.onConfirm).not.toHaveBeenCalled();
    });

    it('shows error when "Other" is selected but no notes provided', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Other (specify in notes)' } });
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please provide details in notes when selecting "Other"')).toBeInTheDocument();
      });

      expect(mockProps.onConfirm).not.toHaveBeenCalled();
    });

    it('clears validation errors when user starts typing', async () => {
      render(<RejectDialog {...mockProps} />);
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a rejection reason')).toBeInTheDocument();
      });

      // Fix the error
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Please select a rejection reason')).not.toBeInTheDocument();
      });
    });

    it('allows submission with valid reason and no notes', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalledWith('Illegible prescription', undefined);
      });
    });

    it('includes notes when provided', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      const notesTextarea = screen.getByRole('textbox');
      
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(notesTextarea, { target: { value: 'Cannot read medication name' } });
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalledWith('Illegible prescription', 'Cannot read medication name');
      });
    });

    it('trims whitespace from notes', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      const notesTextarea = screen.getByRole('textbox');
      
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(notesTextarea, { target: { value: '  whitespace notes  ' } });
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalledWith('Illegible prescription', 'whitespace notes');
      });
    });

    it('passes undefined for empty notes', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      const notesTextarea = screen.getByRole('textbox');
      
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(notesTextarea, { target: { value: '   ' } }); // Only whitespace
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalledWith('Illegible prescription', undefined);
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state on submit button', () => {
      render(<RejectDialog {...mockProps} isLoading={true} />);
      
      expect(screen.getByText('Rejecting...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rejecting/i })).toBeDisabled();
    });

    it('disables form controls when loading', () => {
      render(<RejectDialog {...mockProps} isLoading={true} />);
      
      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /rejecting/i })).toBeDisabled();
    });

    it('shows loading spinner when loading', () => {
      render(<RejectDialog {...mockProps} isLoading={true} />);
      
      // Check for loading spinner (svg with animate-spin class)
      const spinner = screen.getByRole('button', { name: /rejecting/i }).querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Dialog Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<RejectDialog {...mockProps} />);
      
      const closeButton = screen.getByLabelText('Close dialog');
      fireEvent.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      render(<RejectDialog {...mockProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when loading', () => {
      render(<RejectDialog {...mockProps} isLoading={true} />);
      
      const closeButton = screen.getByLabelText('Close dialog');
      fireEvent.click(closeButton);
      
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    it('prevents form submission when validation fails', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const form = screen.getByRole('button', { name: /reject prescription/i }).closest('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a rejection reason')).toBeInTheDocument();
      });

      expect(mockProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<RejectDialog {...mockProps} />);
      
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveAccessibleName(/reason for rejection/i);
      expect(screen.getByRole('textbox')).toHaveAccessibleName(/additional notes/i);
    });

    it('associates validation errors with form fields', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByText('Please select a rejection reason');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('has proper form labels', () => {
      render(<RejectDialog {...mockProps} />);
      
      expect(screen.getByLabelText(/reason for rejection/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    it('resets form when dialog is reopened', async () => {
      const { rerender } = render(<RejectDialog {...mockProps} />);
      
      // Fill out form
      const reasonSelect = screen.getByRole('combobox');
      const notesTextarea = screen.getByRole('textbox');
      
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
      
      // Close dialog
      rerender(<RejectDialog {...mockProps} isOpen={false} />);
      
      // Reopen dialog
      rerender(<RejectDialog {...mockProps} isOpen={true} />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveValue('');
        expect(screen.getByRole('textbox')).toHaveValue('');
      });
    });

    it('clears validation errors when dialog reopens', async () => {
      const { rerender } = render(<RejectDialog {...mockProps} />);
      
      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a rejection reason')).toBeInTheDocument();
      });

      // Close and reopen dialog
      rerender(<RejectDialog {...mockProps} isOpen={false} />);
      rerender(<RejectDialog {...mockProps} isOpen={true} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Please select a rejection reason')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty reason selection gracefully', async () => {
      render(<RejectDialog {...mockProps} />);
      
      const reasonSelect = screen.getByRole('combobox');
      fireEvent.change(reasonSelect, { target: { value: 'Illegible prescription' } });
      fireEvent.change(reasonSelect, { target: { value: '' } }); // Clear selection
      
      const submitButton = screen.getByRole('button', { name: /reject prescription/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a rejection reason')).toBeInTheDocument();
      });
    });

    it('handles very long notes text', () => {
      render(<RejectDialog {...mockProps} />);
      
      const notesTextarea = screen.getByRole('textbox');
      const longText = 'A'.repeat(1000);
      
      fireEvent.change(notesTextarea, { target: { value: longText } });
      expect(notesTextarea).toHaveValue(longText);
    });
  });
});