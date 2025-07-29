import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PrescriptionOrder, PrescriptionOrderStatus } from '@pharmarx/shared-types';
import { prescriptionService } from '../../../services/prescriptionService';

interface UseOrderStatusProps {
  orderId: string;
  onStatusChange?: (status: PrescriptionOrderStatus, order: PrescriptionOrder) => void;
  pollInterval?: number;
  enabled?: boolean;
}

interface OrderStatusState {
  isLoading: boolean;
  error?: string;
  order?: PrescriptionOrder;
}

export const useOrderStatus = ({ 
  orderId, 
  onStatusChange, 
  pollInterval = 15000, // 15 seconds default
  enabled = true 
}: UseOrderStatusProps) => {
  const [state, setState] = useState<OrderStatusState>({
    isLoading: false,
    error: undefined,
    order: undefined
  });

  // Query for order status with polling
  const orderQuery = useQuery({
    queryKey: ['order-status', orderId],
    queryFn: async () => {
      try {
        const order = await prescriptionService.getPrescriptionOrder(orderId);
        return order;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch order status');
      }
    },
    enabled: !!orderId && enabled,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10 seconds
    onSuccess: (order) => {
      const previousOrder = state.order;
      setState(prev => ({
        ...prev,
        order,
        error: undefined
      }));

      // Trigger status change callback if status changed
      if (previousOrder && previousOrder.status !== order.status) {
        onStatusChange?.(order.status, order);
      } else if (!previousOrder) {
        // First load
        onStatusChange?.(order.status, order);
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load order status'
      }));
    }
  });

  const refetchStatus = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    orderQuery.refetch().finally(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    });
  }, [orderQuery]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Helper to check if order is in a specific status
  const isStatus = useCallback((status: PrescriptionOrderStatus) => {
    return orderQuery.data?.status === status;
  }, [orderQuery.data?.status]);

  // Helper to check if order can be updated (for pharmacist view)
  const canUpdateStatus = useCallback(() => {
    const status = orderQuery.data?.status;
    return status && ['awaiting_payment', 'preparing', 'out_for_delivery'].includes(status);
  }, [orderQuery.data?.status]);

  // Helper to get next possible status
  const getNextStatuses = useCallback((): PrescriptionOrderStatus[] => {
    const currentStatus = orderQuery.data?.status;
    
    const statusFlow: Record<PrescriptionOrderStatus, PrescriptionOrderStatus[]> = {
      'pending_verification': ['awaiting_verification'],
      'awaiting_verification': ['awaiting_payment', 'rejected'],
      'awaiting_payment': ['preparing'],
      'preparing': ['out_for_delivery'],
      'out_for_delivery': ['delivered'],
      'delivered': [],
      'rejected': []
    };

    return currentStatus ? statusFlow[currentStatus] || [] : [];
  }, [orderQuery.data?.status]);

  return {
    // State
    isLoading: orderQuery.isLoading || state.isLoading,
    error: state.error || (orderQuery.error as Error)?.message,
    order: orderQuery.data || state.order,
    
    // Query states for more granular control
    isPolling: orderQuery.isFetching,
    lastUpdated: orderQuery.dataUpdatedAt,
    
    // Actions
    refetchStatus,
    clearError,
    
    // Helpers
    isStatus,
    canUpdateStatus,
    getNextStatuses,
    
    // Raw query object for advanced usage
    orderQuery
  };
};

// Specialized hook for payment-specific polling (maintains backward compatibility)
export const usePaymentStatus = (orderId: string, onStatusChange?: (status: PrescriptionOrderStatus) => void) => {
  return useOrderStatus({
    orderId,
    onStatusChange: onStatusChange ? (status) => onStatusChange(status) : undefined,
    pollInterval: 30000, // 30 seconds for payment polling
    enabled: !!orderId
  });
};

// Specialized hook for order fulfillment tracking
export const useOrderFulfillment = (orderId: string, onStatusChange?: (status: PrescriptionOrderStatus, order: PrescriptionOrder) => void) => {
  return useOrderStatus({
    orderId,
    onStatusChange,
    pollInterval: 15000, // 15 seconds for fulfillment tracking
    enabled: !!orderId
  });
};