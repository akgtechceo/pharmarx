import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RequestPaymentModal } from './RequestPaymentModal';

describe('RequestPaymentModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    orderId: 'test-order-123',
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    expect(screen.getByText('Request Payment from Someone Else')).toBeInTheDocument();
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('How would you like to send the payment link?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<RequestPaymentModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Request Payment from Someone Else')).not.toBeInTheDocument();
  });

  it('displays country code selector with default Benin selection', () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const countrySelect = screen.getByDisplayValue('🇧🇯 Benin (+229)');
    expect(countrySelect).toBeInTheDocument();
  });

  it('allows changing country code', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const countrySelect = screen.getByRole('combobox');
    fireEvent.change(countrySelect, { target: { value: '+233' } });
    
    expect(screen.getByDisplayValue('🇬🇭 Ghana (+233)')).toBeInTheDocument();
  });

  it('formats phone number for Benin correctly', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    fireEvent.change(phoneInput, { target: { value: '12345678' } });
    
    expect(phoneInput).toHaveValue('12 34 56 78');
  });

  it('validates phone number and shows error for invalid input', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
    
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number for the selected country')).toBeInTheDocument();
    });
  });

  it('shows required field error when phone number is empty', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
  });

  it('allows selecting message type (WhatsApp/SMS)', () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    // Get buttons by more specific content to avoid ambiguity
    const whatsappButton = screen.getByText('WhatsApp').closest('button');
    const smsButton = screen.getByText('SMS').closest('button');
    
    expect(whatsappButton).toHaveClass('border-green-500');
    expect(smsButton).toHaveClass('border-gray-200');
    
    fireEvent.click(smsButton!);
    
    expect(smsButton).toHaveClass('border-blue-500');
    expect(whatsappButton).toHaveClass('border-gray-200');
  });

  it('submits form with correct data when valid', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
    
    fireEvent.change(phoneInput, { target: { value: '12345678' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'whatsapp'
      });
    });
  });

  it('submits with SMS when SMS is selected', async () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const smsButton = screen.getByText('SMS').closest('button');
    
    fireEvent.click(smsButton!);
    fireEvent.change(phoneInput, { target: { value: '12345678' } });
    
    await waitFor(() => {
      const updatedSubmitButton = screen.getByRole('button', { name: /send via sms/i });
      fireEvent.click(updatedSubmitButton);
    });
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith({
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'sms'
      });
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button (X) is clicked', () => {
    render(<RequestPaymentModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // Close button without text
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<RequestPaymentModal {...mockProps} isLoading={true} />);
    
    const submitButton = screen.getByRole('button', { name: /sending/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('disables form interactions when loading', () => {
    render(<RequestPaymentModal {...mockProps} isLoading={true} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const countrySelect = screen.getByRole('combobox');
    const whatsappButton = screen.getByRole('button', { name: /whatsapp/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    expect(phoneInput).toBeDisabled();
    expect(countrySelect).toBeDisabled();
    expect(whatsappButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('resets form on successful submission', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RequestPaymentModal {...mockProps} onSubmit={mockOnSubmit} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
    
    fireEvent.change(phoneInput, { target: { value: '12345678' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(phoneInput).toHaveValue('');
    });
  });

  it('shows error when submission fails', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<RequestPaymentModal {...mockProps} onSubmit={mockOnSubmit} />);
    
    const phoneInput = screen.getByPlaceholderText('12 34 56 78');
    const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
    
    fireEvent.change(phoneInput, { target: { value: '12345678' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send payment request. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Phone number validation by country', () => {
    it('validates Ghana phone numbers correctly', async () => {
      render(<RequestPaymentModal {...mockProps} />);
      
      const countrySelect = screen.getByRole('combobox');
      const phoneInput = screen.getByPlaceholderText('12 34 56 78');
      const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
      
      fireEvent.change(countrySelect, { target: { value: '+233' } });
      fireEvent.change(phoneInput, { target: { value: '123456789' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          orderId: 'test-order-123',
          recipientPhone: '+233123456789',
          messageType: 'whatsapp'
        });
      });
    });

    it('validates Nigeria phone numbers correctly', async () => {
      render(<RequestPaymentModal {...mockProps} />);
      
      const countrySelect = screen.getByRole('combobox');
      const phoneInput = screen.getByPlaceholderText('12 34 56 78');
      const submitButton = screen.getByRole('button', { name: /send via whatsapp/i });
      
      fireEvent.change(countrySelect, { target: { value: '+234' } });
      fireEvent.change(phoneInput, { target: { value: '1234567890' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          orderId: 'test-order-123',
          recipientPhone: '+2341234567890',
          messageType: 'whatsapp'
        });
      });
    });
  });
});