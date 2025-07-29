import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddProfileModal } from '../AddProfileModal';
import { CreateProfileRequest } from '@pharmarx/shared-types';

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: ({ className }: { className: string }) => (
    <svg className={className} data-testid="x-mark-icon" />
  ),
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false
};

describe('AddProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<AddProfileModal {...defaultProps} />);
    
    expect(screen.getByText('Add New Patient Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Patient Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Date of Birth *')).toBeInTheDocument();
    expect(screen.getByLabelText('Include insurance information')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AddProfileModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Add New Patient Profile')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('x-mark-icon').parentElement;
    fireEvent.click(closeButton!);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Patient name is required')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('validates date of birth is not in the future', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    
    // Set future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    fireEvent.change(dobInput, { target: { value: futureDate.toISOString().split('T')[0] } });
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Date of birth cannot be in the future')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        patientName: 'John Doe',
        dateOfBirth: '1990-01-01',
        insuranceDetails: undefined
      });
    });
  });

  it('submits form with insurance information when checkbox is checked', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    const insuranceCheckbox = screen.getByLabelText('Include insurance information');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
    fireEvent.click(insuranceCheckbox);
    
    const providerInput = screen.getByLabelText('Insurance Provider *');
    const policyInput = screen.getByLabelText('Policy Number *');
    
    fireEvent.change(providerInput, { target: { value: 'Test Insurance' } });
    fireEvent.change(policyInput, { target: { value: 'POL123456' } });
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        patientName: 'John Doe',
        dateOfBirth: '1990-01-01',
        insuranceDetails: {
          provider: 'Test Insurance',
          policyNumber: 'POL123456'
        }
      });
    });
  });

  it('validates insurance fields when insurance is included', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    const insuranceCheckbox = screen.getByLabelText('Include insurance information');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
    fireEvent.click(insuranceCheckbox);
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Insurance provider is required')).toBeInTheDocument();
      expect(screen.getByText('Policy number is required')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('clears errors when user starts typing', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Patient name is required')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText('Patient Name *');
    fireEvent.change(nameInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Patient name is required')).not.toBeInTheDocument();
    });
  });

  it('shows loading state when submitting', () => {
    render(<AddProfileModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Creating...')).toBeDisabled();
  });

  it('disables form inputs when loading', () => {
    render(<AddProfileModal {...defaultProps} isLoading={true} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    const insuranceCheckbox = screen.getByLabelText('Include insurance information');
    
    expect(nameInput).toBeDisabled();
    expect(dobInput).toBeDisabled();
    expect(insuranceCheckbox).toBeDisabled();
  });

  it('prevents closing when loading', () => {
    render(<AddProfileModal {...defaultProps} isLoading={true} />);
    
    const closeButton = screen.getByTestId('x-mark-icon').parentElement;
    fireEvent.click(closeButton!);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('prevents backdrop click when loading', () => {
    render(<AddProfileModal {...defaultProps} isLoading={true} />);
    
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('handles form submission error', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    render(<AddProfileModal {...defaultProps} onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(dobInput, { target: { value: '1990-01-01' } });
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('toggles insurance fields visibility', () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const insuranceCheckbox = screen.getByLabelText('Include insurance information');
    
    // Initially, insurance fields should not be visible
    expect(screen.queryByLabelText('Insurance Provider *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Policy Number *')).not.toBeInTheDocument();
    
    // Check the checkbox
    fireEvent.click(insuranceCheckbox);
    
    // Insurance fields should now be visible
    expect(screen.getByLabelText('Insurance Provider *')).toBeInTheDocument();
    expect(screen.getByLabelText('Policy Number *')).toBeInTheDocument();
    
    // Uncheck the checkbox
    fireEvent.click(insuranceCheckbox);
    
    // Insurance fields should be hidden again
    expect(screen.queryByLabelText('Insurance Provider *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Policy Number *')).not.toBeInTheDocument();
  });

  it('validates invalid date format', async () => {
    render(<AddProfileModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Patient Name *');
    const dobInput = screen.getByLabelText('Date of Birth *');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(dobInput, { target: { value: 'invalid-date' } });
    
    const submitButton = screen.getByText('Create Profile');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid date')).toBeInTheDocument();
    });
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });
});