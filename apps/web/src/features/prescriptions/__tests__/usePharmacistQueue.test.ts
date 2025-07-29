import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePharmacistQueue } from '../hooks/usePharmacistQueue';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'fake-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock data
const mockOrders: PrescriptionOrder[] = [
  {
    orderId: 'order-123',
    patientProfileId: 'patient-abc',
    status: 'awaiting_verification',
    originalImageUrl: 'https://example.com/image1.jpg',
    extractedText: 'Prescription text 1',
    ocrStatus: 'completed',
    ocrConfidence: 0.95,
    medicationDetails: {
      name: 'Amoxicillin',
      dosage: '500mg',
      quantity: 30
    },
    userVerified: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:30:00Z')
  },
  {
    orderId: 'order-456',
    patientProfileId: 'patient-xyz',
    status: 'awaiting_verification',
    originalImageUrl: 'https://example.com/image2.jpg',
    extractedText: 'Prescription text 2',
    ocrStatus: 'completed',
    ocrConfidence: 0.87,
    medicationDetails: {
      name: 'Lisinopril',
      dosage: '10mg',
      quantity: 90
    },
    userVerified: true,
    createdAt: new Date('2025-01-02T14:00:00Z'),
    updatedAt: new Date('2025-01-02T14:15:00Z')
  }
];

const mockApiResponse = {
  success: true,
  data: {
    orders: mockOrders,
    totalCount: 2,
    totalPages: 1,
    currentPage: 1
  }
};

describe('usePharmacistQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.filters).toEqual({});
      expect(result.current.sort).toEqual({
        field: 'createdAt',
        direction: 'desc'
      });
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.totalOrders).toBe(0);
    });
  });

  describe('API Calls', () => {
    it('should fetch orders on initial load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pharmacist/orders?'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          }
        })
      );

      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.totalOrders).toBe(2);
      expect(result.current.totalPages).toBe(1);
    });

    it('should include correct query parameters in API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      renderHook(() => usePharmacistQueue({ pageSize: 20 }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const [url] = mockFetch.mock.calls[0];
      const urlObj = new URL(url);
      
      expect(urlObj.searchParams.get('page')).toBe('1');
      expect(urlObj.searchParams.get('pageSize')).toBe('20');
      expect(urlObj.searchParams.get('sortField')).toBe('createdAt');
      expect(urlObj.searchParams.get('sortDirection')).toBe('desc');
      expect(urlObj.searchParams.get('status')).toBe('awaiting_verification');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch orders: Internal Server Error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.orders).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle unsuccessful API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Access denied'
        })
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.error).toBe('Access denied');
      });
    });
  });

  describe('Filtering', () => {
    it('should update filters and reset to page 1', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateFilters({ patientName: 'John Doe' });
      });

      expect(result.current.filters.patientName).toBe('John Doe');
      expect(result.current.currentPage).toBe(1);

      // Should trigger new API call with filters
      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const [url] = lastCall;
        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('patientName')).toBe('John Doe');
      });
    });

    it('should clear all filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set some filters first
      act(() => {
        result.current.updateFilters({ 
          patientName: 'John Doe', 
          medicationType: 'Amoxicillin',
          urgency: 'high'
        });
      });

      expect(result.current.filters).toEqual({
        patientName: 'John Doe',
        medicationType: 'Amoxicillin',
        urgency: 'high'
      });

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.currentPage).toBe(1);
    });

    it('should include date range filter in API call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      act(() => {
        result.current.updateFilters({ 
          dateRange: { start: startDate, end: endDate }
        });
      });

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const [url] = lastCall;
        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('startDate')).toBe(startDate.toISOString());
        expect(urlObj.searchParams.get('endDate')).toBe(endDate.toISOString());
      });
    });
  });

  describe('Sorting', () => {
    it('should update sort and reset to page 1', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSort({ field: 'patientName', direction: 'asc' });
      });

      expect(result.current.sort).toEqual({
        field: 'patientName',
        direction: 'asc'
      });
      expect(result.current.currentPage).toBe(1);

      // Should trigger new API call with new sort
      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const [url] = lastCall;
        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('sortField')).toBe('patientName');
        expect(urlObj.searchParams.get('sortDirection')).toBe('asc');
      });
    });
  });

  describe('Pagination', () => {
    it('should go to specific page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockApiResponse,
          data: {
            ...mockApiResponse.data,
            totalPages: 5
          }
        })
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.currentPage).toBe(3);

      // Should trigger new API call with new page
      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const [url] = lastCall;
        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('page')).toBe('3');
      });
    });

    it('should not go to invalid pages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockApiResponse,
          data: {
            ...mockApiResponse.data,
            totalPages: 3
          }
        })
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.totalPages).toBe(3);
      });

      // Try to go to page 0
      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.currentPage).toBe(1); // Should stay at current page

      // Try to go to page beyond total
      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(1); // Should stay at current page
    });
  });

  describe('Refresh', () => {
    it('should refresh queue data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      act(() => {
        result.current.refreshQueue();
      });

      expect(mockFetch.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe('Order Management', () => {
    it('should update order in queue', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(2);
      });

      const updatedOrder: PrescriptionOrder = {
        ...mockOrders[0],
        status: 'awaiting_verification',
        pharmacistReview: {
          reviewedBy: 'pharmacist-123',
          reviewedAt: new Date(),
          approved: true,
          calculatedCost: 25.99
        }
      };

      act(() => {
        result.current.updateOrderInQueue(updatedOrder);
      });

      expect(result.current.orders[0]).toEqual(updatedOrder);
    });

    it('should remove order from queue when status changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(2);
      });

      const updatedOrder: PrescriptionOrder = {
        ...mockOrders[0],
        status: 'awaiting_payment' // No longer awaiting verification
      };

      act(() => {
        result.current.updateOrderInQueue(updatedOrder);
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].orderId).toBe('order-456');
    });

    it('should remove order from queue by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePharmacistQueue());

      await waitFor(() => {
        expect(result.current.orders).toHaveLength(2);
      });

      act(() => {
        result.current.removeOrderFromQueue('order-123');
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].orderId).toBe('order-456');
    });
  });

  describe('Auto Refresh', () => {
    it('should auto refresh when enabled', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      renderHook(() => usePharmacistQueue({ 
        autoRefresh: true, 
        refreshInterval: 1000 
      }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto refresh when disabled', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      renderHook(() => usePharmacistQueue({ autoRefresh: false }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should still only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not refresh if already loading', async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockApiResponse
          }), 2000)
        )
      );

      const { result } = renderHook(() => usePharmacistQueue({ 
        autoRefresh: true,
        refreshInterval: 1000 
      }));

      // Wait for initial call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward to trigger refresh while still loading
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Should not make another call while loading
      expect(result.current.isLoading).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Props', () => {
    it('should use custom page size', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      renderHook(() => usePharmacistQueue({ pageSize: 25 }));

      await waitFor(() => {
        const [url] = mockFetch.mock.calls[0];
        const urlObj = new URL(url);
        expect(urlObj.searchParams.get('pageSize')).toBe('25');
      });
    });

    it('should use custom refresh interval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      renderHook(() => usePharmacistQueue({ 
        autoRefresh: true,
        refreshInterval: 5000 
      }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward less than refresh interval
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Fast forward to refresh interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});