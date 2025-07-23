import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterForm from './RegisterForm';
import { UserRole } from '@pharmarx/shared-types';

describe('RegisterForm', () => {
  const mockOnSubmit = vi.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders all form fields correctly', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Check role options
    expect(screen.getByText('Patient/Caregiver')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Pharmacist')).toBeInTheDocument();
    
    // Check contact method toggle
    expect(screen.getByDisplayValue('email')).toBeInTheDocument();
    expect(screen.getByDisplayValue('phone')).toBeInTheDocument();
    
    // Check form inputs
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    
    // Check submit button
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('defaults to Patient role and email contact type', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const patientRadio = screen.getByDisplayValue(UserRole.Patient);
    const emailRadio = screen.getByDisplayValue('email');
    
    expect(patientRadio).toBeChecked();
    expect(emailRadio).toBeChecked();
  });

  it('allows role selection', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const doctorRadio = screen.getByDisplayValue(UserRole.Doctor);
    await user.click(doctorRadio);
    
    expect(doctorRadio).toBeChecked();
  });

  it('switches between email and phone contact types', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Initially shows email input
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
    
    // Switch to phone
    const phoneRadio = screen.getByDisplayValue('phone');
    await user.click(phoneRadio);
    
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Display name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Switch to phone contact type
    const phoneRadio = screen.getByDisplayValue('phone');
    await user.click(phoneRadio);
    
    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, 'invalid-phone#$%');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, '123');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'different-password');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('validates display name minimum length', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.type(displayNameInput, 'A');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('submits form with email contact type', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Fill form with email
    const doctorRadio = screen.getByDisplayValue(UserRole.Doctor);
    await user.click(doctorRadio);
    
    await user.type(screen.getByLabelText(/email address/i), 'doctor@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'Dr. Smith');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        role: UserRole.Doctor,
        contactType: 'email',
        email: 'doctor@example.com',
        displayName: 'Dr. Smith',
        password: 'password123',
        confirmPassword: 'password123'
      });
    });
  });

  it('submits form with phone contact type', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Switch to phone and fill form
    const phoneRadio = screen.getByDisplayValue('phone');
    await user.click(phoneRadio);
    
    const pharmacistRadio = screen.getByDisplayValue(UserRole.Pharmacist);
    await user.click(pharmacistRadio);
    
    await user.type(screen.getByLabelText(/phone number/i), '+1 (555) 123-4567');
    await user.type(screen.getByLabelText(/display name/i), 'Pharmacist Joe');
    await user.type(screen.getByLabelText(/^password$/i), 'securepass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepass123');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        role: UserRole.Pharmacist,
        contactType: 'phone',
        phoneNumber: '+1 (555) 123-4567',
        displayName: 'Pharmacist Joe',
        password: 'securepass123',
        confirmPassword: 'securepass123'
      });
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isLoading={true} />);
    
    const submitButton = screen.getByRole('button', { name: /creating account/i });
    expect(submitButton).toBeDisabled();
    
    // All inputs should be disabled during loading
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/display name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Registration failed. Please try again.';
    render(<RegisterForm onSubmit={mockOnSubmit} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-700');
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} />);
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    
    // Start typing in email field
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');
    
    // Error should be cleared
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('handles form submission errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnSubmitWithError = vi.fn().mockRejectedValue(new Error('Network error'));
    
    render(<RegisterForm onSubmit={mockOnSubmitWithError} />);
    
    // Fill valid form
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmitWithError).toHaveBeenCalled();
    });
    
    // Should not crash and should handle error gracefully
    expect(submitButton).toBeInTheDocument();
  });
}); 