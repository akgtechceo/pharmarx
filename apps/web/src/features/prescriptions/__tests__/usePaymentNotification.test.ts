import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { usePaymentNotification, useHasPaymentNotification } from '../hooks/usePaymentNotification';

// Mock the payment notification service
vi.mock('../hooks/usePaymentNotification', async () => {
  const actual = await vi.importActual('../hooks/usePaymentNotification');
  return {
    ...actual,
    // Keep the actual hooks but we'll override the service calls in tests
  };
});

describe('usePaymentNotification', () => {
  let queryClient: QueryClient;
  
  const createWrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: 'test-order-1' }),
      { wrapper: createWrapper }
    );

    expect(result.current.isLoading).toBe(true); // Initially loading
    expect(result.current.error).toBeUndefined();
    expect(result.current.notification).toBeUndefined();
    expect(result.current.isNotificationLoading).toBe(true);
    expect(result.current.isStatusPolling).toBe(false);
  });

  it('should fetch payment notification for valid order', async () => {
    const onStatusChange = vi.fn();
    
    const { result } = renderHook(
      () => usePaymentNotification({ 
        orderId: 'order-1', 
        onStatusChange 
      }),
      { wrapper: createWrapper }
    );

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.notification).toBeDefined();
    expect(result.current.notification?.orderId).toBe('order-1');
    expect(result.current.notification?.status).toBe('awaiting_payment');
    expect(result.current.notification?.calculatedCost).toBe(45.50);
    expect(result.current.error).toBeUndefined();
    expect(onStatusChange).toHaveBeenCalledWith('awaiting_payment');
  });

  it('should handle non-existent order gracefully', async () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: 'non-existent-order' }),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.notification).toBeNull();
    expect(result.current.error).toBeUndefined();
  });

  it('should not make API calls when orderId is empty', () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: '' }),
      { wrapper: createWrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.notification).toBeUndefined();
  });

  it('should provide refetch functionality', async () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: 'order-1' }),
      { wrapper: createWrapper }
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test refetch
    expect(typeof result.current.refetchNotification).toBe('function');
    
    // Call refetch
    result.current.refetchNotification();
    
    // Should trigger loading state briefly
    expect(result.current.isLoading).toBe(true);
  });

  it('should provide error clearing functionality', async () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: 'order-1' }),
      { wrapper: createWrapper }
    );

    expect(typeof result.current.clearError).toBe('function');
    
    // Calling clearError should not throw
    result.current.clearError();
  });

  it('should provide access to raw query objects', async () => {
    const { result } = renderHook(
      () => usePaymentNotification({ orderId: 'order-1' }),
      { wrapper: createWrapper }
    );

    expect(result.current.notificationQuery).toBeDefined();
    expect(result.current.statusQuery).toBeDefined();
    expect(typeof result.current.lastUpdated).toBe('number');
  });

  it('should call onStatusChange when status updates', async () => {
    const onStatusChange = vi.fn();
    
    renderHook(
      () => usePaymentNotification({ 
        orderId: 'order-1', 
        onStatusChange 
      }),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(onStatusChange).toHaveBeenCalledWith('awaiting_payment');
  });

  it('should handle different order IDs with different data', async () => {
    const { result: result1 } = renderHook(
      () => usePaymentNotification({ orderId: 'order-1' }),
      { wrapper: createWrapper }
    );

    const { result: result2 } = renderHook(
      () => usePaymentNotification({ orderId: 'order-2' }),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // Different orders should have different data
    expect(result1.current.notification?.orderId).toBe('order-1');
    expect(result2.current.notification?.orderId).toBe('order-2');
    expect(result1.current.notification?.calculatedCost).toBe(45.50);
    expect(result2.current.notification?.calculatedCost).toBe(28.75);
  });
});

describe('useHasPaymentNotification', () => {
  let queryClient: QueryClient;
  
  const createWrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should return true for orders with payment notifications', async () => {
    const { result } = renderHook(
      () => useHasPaymentNotification('order-1'),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.data).toBe(true);
  });

  it('should return false for orders without payment notifications', async () => {
    const { result } = renderHook(
      () => useHasPaymentNotification('non-existent-order'),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.data).toBe(false);
  });

  it('should not make API calls when orderId is empty', () => {
    const { result } = renderHook(
      () => useHasPaymentNotification(''),
      { wrapper: createWrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should cache results appropriately', async () => {
    const { result: result1 } = renderHook(
      () => useHasPaymentNotification('order-1'),
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second hook with same orderId should use cached result
    const { result: result2 } = renderHook(
      () => useHasPaymentNotification('order-1'),
      { wrapper: createWrapper }
    );

    // Should not be loading since it's cached
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toBe(result1.current.data);
  });
});