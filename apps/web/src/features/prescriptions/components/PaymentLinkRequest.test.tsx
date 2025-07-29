import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaymentLinkRequest } from './PaymentLinkRequest';
import { PaymentLinkResponse } from '@pharmarx/shared-types';

// Mock the RequestPaymentModal component
vi.mock('./RequestPaymentModal', () => ({
  RequestPaymentModal: ({ isOpen, onClose, onSubmit, isLoading }: any) => (
    isOpen ? (
      <div data-testid="request-payment-modal">
        <button onClick={onClose}>Close Modal</button>
        <button 
          onClick={() => onSubmit({
            orderId: 'test-order-123',
            recipientPhone: '+22912345678',
            messageType: 'whatsapp'
          })}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Submit'}
        </button>
      </div>
    ) : null
  )
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-auth-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('PaymentLinkRequest', () => {
  const mockProps = {
    orderId: 'test-order-123',
    onSuccess: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders the request payment button', () => {
    render(<PaymentLinkRequest {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /request payment from someone else/i })).toBeInTheDocument();
    expect(screen.getByText('Send a secure payment link via WhatsApp or SMS to a friend or family member')).toBeInTheDocument();
  });

  it('opens modal when button is clicked', () => {
    render(<PaymentLinkRequest {...mockProps} />);
    
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    expect(screen.getByTestId('request-payment-modal')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    // Close modal
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('request-payment-modal')).not.toBeInTheDocument();
  });

  it('makes API call when form is submitted', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    // Submit form
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/orders/test-order-123/request-payment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-auth-token'
          },
          body: JSON.stringify({
            orderId: 'test-order-123',
            recipientPhone: '+22912345678',
            messageType: 'whatsapp'
          })
        }
      );
    });
  });

  it('calls onSuccess callback when API call succeeds', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('shows success message when payment link is sent', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment Link Sent!')).toBeInTheDocument();
      expect(screen.getByText(/Payment link successfully sent via WhatsApp to \+229\*\*\*\*\*78/)).toBeInTheDocument();
    });
  });

  it('closes modal after successful submission', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('request-payment-modal')).not.toBeInTheDocument();
    });
  });

  it('calls onError callback when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request'
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Failed to send payment request: Bad Request');
    });
  });

  it('handles API response with success: false', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: false,
      error: 'Invalid phone number'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Invalid phone number');
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Network error');
    });
  });

  it('shows loading state during API call', async () => {
    // Create a promise that we can resolve later
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(mockPromise);

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });
  });

  it('masks phone numbers correctly', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      // Phone number +22912345678 should be masked as +229*****78
      expect(screen.getByText(/\+229\*\*\*\*\*78/)).toBeInTheDocument();
    });
  });

  it('dismisses success message when close button is clicked', async () => {
    const mockResponse: PaymentLinkResponse = {
      success: true,
      data: {
        linkId: 'link-123',
        paymentToken: 'token-123',
        publicUrl: 'https://example.com/pay/token-123',
        expiresAt: new Date('2024-12-20T12:00:00Z')
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<PaymentLinkRequest {...mockProps} />);
    
    // Open modal and submit
    const button = screen.getByRole('button', { name: /request payment from someone else/i });
    fireEvent.click(button);
    
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment Link Sent!')).toBeInTheDocument();
    });
    
    // Find and click the close button in the success message
    const closeButtons = screen.getAllByRole('button');
    const successCloseButton = closeButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );
    
    fireEvent.click(successCloseButton!);
    
    expect(screen.queryByText('Payment Link Sent!')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<PaymentLinkRequest {...mockProps} className="custom-class" />);
    
    const container = screen.getByRole('button', { name: /request payment from someone else/i }).parentElement;
    expect(container).toHaveClass('custom-class');
  });
});