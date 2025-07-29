import { PrescriptionOrder, PaymentNotification, PaymentGateway, PaymentStatus, ApiResponse } from '@pharmarx/shared-types';

export interface PaymentNotificationState {
  isLoading: boolean;
  error?: string;
  notification?: PaymentNotification;
}

export interface PaymentProcessingState {
  isProcessing: boolean;
  selectedGateway?: PaymentGateway;
  error?: string;
  success: boolean;
}

export interface PaymentMethodOption {
  gateway: PaymentGateway;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export interface ProcessPaymentRequest {
  orderId: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
}

export interface PaymentApiResponse extends ApiResponse<{ paymentId: string; transactionId: string }> {
  // Additional payment-specific response fields
}

export interface UsePaymentNotificationProps {
  orderId: string;
  onStatusChange?: (status: string) => void;
}

export interface UsePaymentProcessingProps {
  orderId: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}