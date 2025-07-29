import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ReceiptDownload } from './ReceiptDownload';
import { useAuthStore } from '../../../stores/authStore';

// Mock dependencies
vi.mock('../../../stores/authStore');

const mockUseAuthStore = vi.mocked(useAuthStore);

// Mock fetch
global.fetch = vi.fn();

describe('ReceiptDownload', () => {
  const mockOrderId = 'order-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { uid: mockUserId },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  it('should render download button', () => {
    render(<ReceiptDownload orderId={mockOrderId} />);

    expect(screen.getByText('Download Receipt')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show loading state when downloading', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(new Response('fake-pdf-content', {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="receipt-order-123.pdf"',
            },
          }));
        }, 100);
      })
    );

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should handle successful download', async () => {
    const mockFetch = vi.mocked(fetch);
    const mockBlob = new Blob(['fake-pdf-content'], { type: 'application/pdf' });
    
    mockFetch.mockResolvedValue(new Response(mockBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="receipt-order-123.pdf"',
      },
    }));

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:fake-url');
    const mockRevokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    });

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockLink);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild,
      writable: true,
    });

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/orders/${mockOrderId}/receipt?patientId=${mockUserId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/pdf',
          },
        }
      );
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  it('should handle download error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Order not found')).toBeInTheDocument();
    });

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should handle network error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should handle missing user authentication', async () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('User not authenticated')).toBeInTheDocument();
    });
  });

  it('should use default filename when Content-Disposition is missing', async () => {
    const mockFetch = vi.mocked(fetch);
    const mockBlob = new Blob(['fake-pdf-content'], { type: 'application/pdf' });
    
    mockFetch.mockResolvedValue(new Response(mockBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // No Content-Disposition header
      },
    }));

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:fake-url');
    const mockRevokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    });

    // Mock document.createElement and related DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockLink);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild,
      writable: true,
    });

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('receipt-order-123.pdf');
    });
  });

  it('should clear error when starting new download', async () => {
    const mockFetch = vi.mocked(fetch);
    
    // First call fails
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));

    // Second call succeeds
    const mockBlob = new Blob(['fake-pdf-content'], { type: 'application/pdf' });
    mockFetch.mockResolvedValueOnce(new Response(mockBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="receipt-order-123.pdf"',
      },
    }));

    // Mock URL methods
    const mockCreateObjectURL = vi.fn(() => 'blob:fake-url');
    const mockRevokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    });

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockLink);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild,
      writable: true,
    });

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    
    // First download - should fail
    fireEvent.click(downloadButton);
    await waitFor(() => {
      expect(screen.getByText('Order not found')).toBeInTheDocument();
    });

    // Second download - should succeed and clear error
    fireEvent.click(downloadButton);
    await waitFor(() => {
      expect(screen.queryByText('Order not found')).not.toBeInTheDocument();
    });
  });

  it('should disable button during download', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(new Response('fake-pdf-content', {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
            },
          }));
        }, 100);
      })
    );

    render(<ReceiptDownload orderId={mockOrderId} />);

    const downloadButton = screen.getByText('Download Receipt');
    fireEvent.click(downloadButton);

    expect(downloadButton).toBeDisabled();

    await waitFor(() => {
      expect(downloadButton).not.toBeDisabled();
    });
  });
});