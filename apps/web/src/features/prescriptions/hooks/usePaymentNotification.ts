import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaymentNotification, PrescriptionOrder } from '@pharmarx/shared-types';
import { UsePaymentNotificationProps, PaymentNotificationState } from '../types/payment.types';

// Mock Payment Notification Service
class PaymentNotificationService {
  static async fetchPaymentNotification(orderId: string): Promise<PaymentNotification | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock response - in real implementation, this would query the backend
    // to check if order status is 'awaiting_payment' and return notification data
    
    // Mock data for orders with 'awaiting_payment' status
    const mockNotifications: Record<string, PaymentNotification> = {
      'order-1': {
        orderId: 'order-1',
        status: 'awaiting_payment',
        calculatedCost: 45.50,
        medicationDetails: {
          name: 'Amoxicillin 500mg',
          dosage: '500mg, twice daily',
          quantity: 20
        },
        pharmacyInfo: {
          name: 'Central Pharmacy Cotonou',
          address: '123 Avenue de la République, Cotonou, Benin',
          phone: '+229 21 30 45 67'
        },
        estimatedDelivery: {
          timeframe: '2-3 business days',
          description: 'Delivery within Cotonou metropolitan area. Express delivery available for additional fee.'
        },
        approvedAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      'order-2': {
        orderId: 'order-2',
        status: 'awaiting_payment',
        calculatedCost: 28.75,
        medicationDetails: {
          name: 'Ibuprofen 400mg',
          dosage: '400mg, as needed for pain',
          quantity: 30
        },
        pharmacyInfo: {
          name: 'Pharmacie Nouvelle',
          address: '456 Rue des Palmiers, Porto-Novo, Benin',
          phone: '+229 22 21 88 99'
        },
        estimatedDelivery: {
          timeframe: '3-4 business days',
          description: 'Standard delivery to Porto-Novo area. Same-day delivery available before 2 PM.'
        },
        approvedAt: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
      }
    };

    return mockNotifications[orderId] || null;
  }

  static async pollOrderStatus(orderId: string): Promise<{ status: string; hasPaymentNotification: boolean }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock status polling - in real implementation, this would check current order status
    return {
      status: 'awaiting_payment', // This would come from the actual order
      hasPaymentNotification: true
    };
  }
}

export const usePaymentNotification = ({ orderId, onStatusChange }: UsePaymentNotificationProps) => {
  const [state, setState] = useState<PaymentNotificationState>({
    isLoading: false,
    error: undefined,
    notification: undefined
  });

  // Query for payment notification data
  const notificationQuery = useQuery({
    queryKey: ['payment-notification', orderId],
    queryFn: () => PaymentNotificationService.fetchPaymentNotification(orderId),
    enabled: !!orderId,
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    refetchIntervalInBackground: true,
    staleTime: 10000, // Consider data stale after 10 seconds
    onSuccess: (data) => {
      if (data) {
        setState(prev => ({
          ...prev,
          notification: data,
          error: undefined
        }));
        onStatusChange?.(data.status);
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load payment notification'
      }));
    }
  });

  // Query for order status polling (lighter weight check)
  const statusQuery = useQuery({
    queryKey: ['order-payment-status', orderId],
    queryFn: () => PaymentNotificationService.pollOrderStatus(orderId),
    enabled: !!orderId,
    refetchInterval: 15000, // Poll more frequently for status changes
    refetchIntervalInBackground: true,
    onSuccess: (data) => {
      onStatusChange?.(data.status);
      
      // If status indicates payment notification is available, refetch notification data
      if (data.hasPaymentNotification && !notificationQuery.data) {
        notificationQuery.refetch();
      }
    }
  });

  const refetchNotification = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    notificationQuery.refetch().finally(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    });
  }, [notificationQuery]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  return {
    // State
    isLoading: notificationQuery.isLoading || statusQuery.isLoading || state.isLoading,
    error: state.error || (notificationQuery.error as Error)?.message || (statusQuery.error as Error)?.message,
    notification: notificationQuery.data || state.notification,
    
    // Query states for more granular control
    isNotificationLoading: notificationQuery.isLoading,
    isStatusPolling: statusQuery.isFetching,
    lastUpdated: notificationQuery.dataUpdatedAt,
    
    // Actions
    refetchNotification,
    clearError,
    
    // Raw query objects for advanced usage
    notificationQuery,
    statusQuery
  };
};

// Helper hook for checking if an order has payment notification available
export const useHasPaymentNotification = (orderId: string) => {
  return useQuery({
    queryKey: ['has-payment-notification', orderId],
    queryFn: async () => {
      const notification = await PaymentNotificationService.fetchPaymentNotification(orderId);
      return !!notification;
    },
    enabled: !!orderId,
    staleTime: 60000, // Cache for 1 minute
  });
};