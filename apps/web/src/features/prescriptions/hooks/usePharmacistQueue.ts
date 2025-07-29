import { useState, useEffect, useCallback } from 'react';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import {
  PharmacistQueueState,
  PharmacistQueueFilters,
  PharmacistQueueSort,
  PharmacistOrdersResponse,
  UsePharmacistQueueProps
} from '../types/pharmacist.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Constants
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds
const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_DIRECTION = 'desc';

export const usePharmacistQueue = ({
  pageSize = DEFAULT_PAGE_SIZE,
  autoRefresh = true,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
}: UsePharmacistQueueProps = {}) => {
  const [state, setState] = useState<PharmacistQueueState>({
    orders: [],
    isLoading: false,
    error: null,
    filters: {},
    sort: {
      field: DEFAULT_SORT_FIELD,
      direction: DEFAULT_SORT_DIRECTION
    },
    currentPage: 1,
    totalPages: 0,
    totalOrders: 0
  });

  const fetchOrders = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        pageSize: pageSize.toString(),
        sortField: state.sort.field,
        sortDirection: state.sort.direction,
        status: 'awaiting_verification'
      });

      // Add filters
      if (state.filters.medicationType) {
        params.append('medicationType', state.filters.medicationType);
      }
      if (state.filters.urgency) {
        params.append('urgency', state.filters.urgency);
      }
      if (state.filters.patientName) {
        params.append('patientName', state.filters.patientName);
      }
      if (state.filters.dateRange) {
        params.append('startDate', state.filters.dateRange.start.toISOString());
        params.append('endDate', state.filters.dateRange.end.toISOString());
      }

      const response = await fetch(`${API_BASE}/pharmacist/orders?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const result: PharmacistOrdersResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch orders');
      }

      setState(prev => ({
        ...prev,
        orders: result.data!.orders,
        totalOrders: result.data!.totalCount,
        totalPages: result.data!.totalPages,
        currentPage: result.data!.currentPage,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }));
    }
  }, [state.currentPage, state.sort, state.filters, pageSize]);

  const updateFilters = useCallback((newFilters: Partial<PharmacistQueueFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1 // Reset to first page when filtering
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      currentPage: 1
    }));
  }, []);

  const updateSort = useCallback((newSort: PharmacistQueueSort) => {
    setState(prev => ({
      ...prev,
      sort: newSort,
      currentPage: 1 // Reset to first page when sorting
    }));
  }, []);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.totalPages) {
      setState(prev => ({ ...prev, currentPage: page }));
    }
  }, [state.totalPages]);

  const refreshQueue = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderInQueue = useCallback((updatedOrder: PrescriptionOrder) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(order => 
        order.orderId === updatedOrder.orderId ? updatedOrder : order
      ).filter(order => order.status === 'awaiting_verification') // Remove if no longer awaiting verification
    }));
  }, []);

  const removeOrderFromQueue = useCallback((orderId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(order => order.orderId !== orderId)
    }));
  }, []);

  // Initial load effect
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh effect - separated to avoid dependency issues
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!state.isLoading) {
        fetchOrders();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, state.isLoading, fetchOrders]);

  return {
    // State
    orders: state.orders,
    isLoading: state.isLoading,
    error: state.error,
    filters: state.filters,
    sort: state.sort,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    totalOrders: state.totalOrders,
    
    // Actions
    updateFilters,
    clearFilters,
    updateSort,
    goToPage,
    refreshQueue,
    updateOrderInQueue,
    removeOrderFromQueue
  };
};