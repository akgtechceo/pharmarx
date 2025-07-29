import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import OrderHistoryPage from './OrderHistoryPage';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { useAuthStore } from '../../../stores/authStore';

// Mock dependencies
vi.mock('../hooks/useOrderHistory');
vi.mock('../../../stores/authStore');
vi.mock('../components/OrderStatusDisplay', () => ({
  OrderStatusDisplay: ({ status }: { status: string }) => (
    <span data-testid="order-status">{status}</span>
  ),
}));
vi.mock('../components/ReceiptDownload', () => ({
  ReceiptDownload: ({ orderId }: { orderId: string }) => (
    <button data-testid="receipt-download">Download Receipt {orderId}</button>
  ),
}));

const mockUseOrderHistory = vi.mocked(useOrderHistory);
const mockUseAuthStore = vi.mocked(useAuthStore);

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockOrders = [
  {
    orderId: 'order-123',
    status: 'delivered' as const,
    medicationDetails: {
      name: 'Aspirin',
      dosage: '500mg',
      quantity: 1,
    },
    cost: 1500,
    createdAt: new Date('2024-01-01'),
    deliveredAt: new Date('2024-01-02'),
    hasReceipt: true,
  },
  {
    orderId: 'order-456',
    status: 'preparing' as const,
    medicationDetails: {
      name: 'Ibuprofen',
      dosage: '400mg',
      quantity: 2,
    },
    cost: 2000,
    createdAt: new Date('2024-01-03'),
    hasReceipt: false,
  },
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 2,
  hasMore: false,
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { uid: 'user-123' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  it('should render loading state initially', () => {
    mockUseOrderHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Order History')).toBeInTheDocument();
    expect(screen.getByText('View and manage your past prescription orders')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should render error state when there is an error', () => {
    mockUseOrderHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load orders' },
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Error loading order history')).toBeInTheDocument();
    expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render empty state when no orders', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: [], pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('No orders found')).toBeInTheDocument();
    expect(screen.getByText("You haven't placed any orders yet. Start by uploading a prescription.")).toBeInTheDocument();
  });

  it('should render order list when orders exist', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Order #order-123')).toBeInTheDocument();
    expect(screen.getByText('Order #order-456')).toBeInTheDocument();
    expect(screen.getByText('Medication: Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Medication: Ibuprofen')).toBeInTheDocument();
    expect(screen.getByText('Dosage: 500mg • Quantity: 1')).toBeInTheDocument();
    expect(screen.getByText('Dosage: 400mg • Quantity: 2')).toBeInTheDocument();
    expect(screen.getByText('Cost: $1500.00')).toBeInTheDocument();
    expect(screen.getByText('Cost: $2000.00')).toBeInTheDocument();
  });

  it('should display order status correctly', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    const statusElements = screen.getAllByTestId('order-status');
    expect(statusElements).toHaveLength(2);
    expect(statusElements[0]).toHaveTextContent('delivered');
    expect(statusElements[1]).toHaveTextContent('preparing');
  });

  it('should show receipt download button for delivered orders with receipts', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Download Receipt order-123')).toBeInTheDocument();
    // Should not show download button for non-delivered order
    expect(screen.queryByText('Download Receipt order-456')).not.toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    const mockRefetch = vi.fn();
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle pagination correctly', () => {
    const mockPaginationWithMore = {
      ...mockPagination,
      total: 25,
      hasMore: true,
    };

    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPaginationWithMore },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Showing 1 to 2 of 25 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should handle page change', async () => {
    const mockRefetch = vi.fn();
    const mockPaginationWithMore = {
      ...mockPagination,
      total: 25,
      hasMore: true,
    };

    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPaginationWithMore },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    const nextButton = screen.getByLabelText('Next');
    fireEvent.click(nextButton);

    // The page change should trigger a new query with updated page number
    await waitFor(() => {
      expect(mockUseOrderHistory).toHaveBeenCalledWith(2, 10);
    });
  });

  it('should format dates correctly', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    expect(screen.getByText('Ordered: Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Delivered: Jan 2, 2024')).toBeInTheDocument();
    expect(screen.getByText('Ordered: Jan 3, 2024')).toBeInTheDocument();
  });

  it('should handle view details button click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(consoleSpy).toHaveBeenCalledWith('View order details:', 'order-123');
    
    consoleSpy.mockRestore();
  });

  it('should disable refresh button when loading', () => {
    mockUseOrderHistory.mockReturnValue({
      data: { orders: mockOrders, pagination: mockPagination },
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<OrderHistoryPage />);

    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
  });
});