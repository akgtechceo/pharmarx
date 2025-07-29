import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from './LoginForm';

// Mock the submit handler
const mockOnSubmit = vi.fn();

describe('LoginForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders login form with all required elements', () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Check main form elements
      expect(screen.getByText('Sign in with:')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('defaults to email contact type', () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailButton = screen.getByText('Email Address');
      const phoneButton = screen.getByText('Phone Number');
      
      // Email button should be active (blue background)
      expect(emailButton).toHaveClass('bg-blue-50', 'text-blue-700');
      expect(phoneButton).toHaveClass('bg-gray-50', 'text-gray-500');
      
      // Email input should be visible
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
    });

    it('displays error message when provided', () => {
      const errorMessage = 'Invalid credentials';
      render(
        <LoginForm onSubmit={mockOnSubmit} error={errorMessage} />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toHaveClass('text-red-600');
    });

    it('disables form when loading', () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} isLoading={true} />
      );

      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      
      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveClass('bg-gray-400', 'cursor-not-allowed');
    });
  });

  describe('Contact Type Toggle', () => {
    it('switches to phone number input when phone button is clicked', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const phoneButton = screen.getByText('Phone Number');
      fireEvent.click(phoneButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
      });

      // Check button states
      expect(phoneButton).toHaveClass('bg-blue-50', 'text-blue-700');
      expect(screen.getByText('Email Address')).toHaveClass('bg-gray-50', 'text-gray-500');
    });

    it('switches back to email input when email button is clicked', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Switch to phone first
      fireEvent.click(screen.getByText('Phone Number'));
      await waitFor(() => {
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      });

      // Switch back to email
      fireEvent.click(screen.getByText('Email Address'));
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
      });
    });

    it('clears input value when switching contact types', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Enter email and switch to phone
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      fireEvent.click(screen.getByText('Phone Number'));
      
      // Switch back to email - input should be cleared
      fireEvent.click(screen.getByText('Email Address'));
      
      await waitFor(() => {
        const newEmailInput = screen.getByLabelText(/email address/i);
        expect(newEmailInput).toHaveValue('');
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty email', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid email format', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for empty phone number', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Switch to phone number
      fireEvent.click(screen.getByText('Phone Number'));
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Phone number is required')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid phone number format', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Switch to phone number
      fireEvent.click(screen.getByText('Phone Number'));
      
      await waitFor(() => {
        const phoneInput = screen.getByLabelText(/phone number/i);
        fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for empty password', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears validation errors when user starts typing', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 't' } });

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with email credentials', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          contactType: 'email',
          email: 'test@example.com',
          phoneNumber: '',
          password: 'password123'
        });
      });
    });

    it('submits form with phone credentials', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      // Switch to phone number
      fireEvent.click(screen.getByText('Phone Number'));
      
      await waitFor(() => {
        const phoneInput = screen.getByLabelText(/phone number/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(phoneInput, { target: { value: '+1 (555) 123-4567' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          contactType: 'phone',
          email: '',
          phoneNumber: '+1 (555) 123-4567',
          password: 'password123'
        });
      });
    });

    it('handles submission errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnSubmit.mockRejectedValue(new Error('Login failed'));

      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Login form submission error:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('prevents submission when form is loading', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} isLoading={true} />
      );

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and attributes', () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('associates validation errors with form fields', async () => {
      render(
        <LoginForm onSubmit={mockOnSubmit} />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        const errorMessage = screen.getByText('Email is required');
        
        expect(emailInput).toHaveClass('border-red-300');
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });
}); 