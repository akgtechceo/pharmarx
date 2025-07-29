import { useState, useCallback } from 'react';
import { PrescriptionOrder, PrescriptionOrderStatus } from '@pharmarx/shared-types';
import {
  ApproveOrderRequest,
  RejectOrderRequest,
  EditOrderRequest,
  PharmacistActionResponse,
  UsePrescriptionReviewProps
} from '../types/pharmacist.types';
import { prescriptionService } from '../../../services/prescriptionService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const usePrescriptionReview = ({
  order,
  onApprove,
  onReject,
  onEdit,
  onError
}: UsePrescriptionReviewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = useCallback(async (
    url: string,
    method: string,
    body: any,
    action: string
  ): Promise<PrescriptionOrder | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action}: ${response.statusText}`);
      }

      const result: PharmacistActionResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || `Failed to ${action}`);
      }

      setIsLoading(false);
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `An unexpected error occurred during ${action}`;
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage, action);
      return null;
    }
  }, [onError]);

  const approveOrder = useCallback(async (request: ApproveOrderRequest) => {
    const updatedOrder = await handleApiCall(
      `${API_BASE}/pharmacist/orders/${request.orderId}/approve`,
      'PUT',
      {
        calculatedCost: request.calculatedCost,
        pharmacistNotes: request.pharmacistNotes,
        editedDetails: request.editedDetails
      },
      'approve order'
    );

    if (updatedOrder) {
      onApprove?.(updatedOrder);
    }
  }, [handleApiCall, onApprove]);

  const rejectOrder = useCallback(async (request: RejectOrderRequest) => {
    const updatedOrder = await handleApiCall(
      `${API_BASE}/pharmacist/orders/${request.orderId}/reject`,
      'PUT',
      {
        rejectionReason: request.rejectionReason,
        pharmacistNotes: request.pharmacistNotes
      },
      'reject order'
    );

    if (updatedOrder) {
      onReject?.(updatedOrder);
    }
  }, [handleApiCall, onReject]);

  const editOrder = useCallback(async (request: EditOrderRequest) => {
    const updatedOrder = await handleApiCall(
      `${API_BASE}/pharmacist/orders/${request.orderId}/edit`,
      'PUT',
      {
        editedDetails: request.editedDetails,
        pharmacistNotes: request.pharmacistNotes
      },
      'edit order'
    );

    if (updatedOrder) {
      onEdit?.(updatedOrder);
    }
  }, [handleApiCall, onEdit]);

  const updateOrderStatus = useCallback(async (status: PrescriptionOrderStatus, onStatusUpdate?: (order: PrescriptionOrder) => void) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedOrder = await prescriptionService.updateOrderStatus(order.orderId, status);
      setIsLoading(false);
      onStatusUpdate?.(updatedOrder);
      return updatedOrder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to update status to ${status}`;
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage, `update status to ${status}`);
      throw error;
    }
  }, [order.orderId, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    approveOrder,
    rejectOrder,
    editOrder,
    updateOrderStatus,
    clearError
  };
};