import { PrescriptionOrder, MedicationDetails, ApiResponse } from '@pharmarx/shared-types';

export interface VerificationFormData extends MedicationDetails {
  // Any additional verification-specific fields can be added here
}

export interface VerificationErrors {
  name?: string;
  dosage?: string;
  quantity?: string;
  general?: string;
}

export interface VerificationState {
  isLoading: boolean;
  isConfirming: boolean;
  isSkipping: boolean;
  errors: VerificationErrors;
}

export interface UpdateOrderRequest {
  orderId: string;
  medicationDetails: MedicationDetails;
  status: 'awaiting_payment' | 'pending_verification';
}

export interface SkipVerificationRequest {
  orderId: string;
  status: 'awaiting_payment';
}

export type VerificationActionType = 'confirm' | 'skip';

export interface VerificationApiResponse extends ApiResponse<PrescriptionOrder> {
  // Any additional response fields specific to verification
}

export interface UseVerificationProps {
  order: PrescriptionOrder;
  onSuccess?: (updatedOrder: PrescriptionOrder, actionType: VerificationActionType) => void;
  onError?: (error: string, actionType: VerificationActionType) => void;
}