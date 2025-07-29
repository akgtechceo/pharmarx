import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PrescriptionOrder, MedicationDetails } from '@pharmarx/shared-types';
import { 
  VerificationState, 
  VerificationErrors,
  UpdateOrderRequest,
  SkipVerificationRequest,
  UseVerificationProps,
  VerificationActionType
} from '../types/verification.types';

// Mock API service - in real implementation, this would call actual backend
class VerificationService {
  static async confirmVerification(request: UpdateOrderRequest): Promise<PrescriptionOrder> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock successful response
    return {
      orderId: request.orderId,
      patientProfileId: 'mock-patient-id',
      status: 'awaiting_payment',
      originalImageUrl: '/mock-prescription.jpg',
      medicationDetails: request.medicationDetails,
      extractedText: 'Mock extracted text',
      ocrStatus: 'completed',
      ocrProcessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as PrescriptionOrder;
  }

  static async skipVerification(request: SkipVerificationRequest): Promise<PrescriptionOrder> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful response
    return {
      orderId: request.orderId,
      patientProfileId: 'mock-patient-id',
      status: 'awaiting_payment',
      originalImageUrl: '/mock-prescription.jpg',
      medicationDetails: undefined, // Pharmacist will handle manually
      extractedText: 'Mock extracted text',
      ocrStatus: 'completed',
      ocrProcessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as PrescriptionOrder;
  }
}

export const useOrderVerification = ({ order, onSuccess, onError }: UseVerificationProps) => {
  const [state, setState] = useState<VerificationState>({
    isLoading: false,
    isConfirming: false,
    isSkipping: false,
    errors: {}
  });

  // Mutation for confirming verification
  const confirmMutation = useMutation({
    mutationFn: (medicationDetails: MedicationDetails) => 
      VerificationService.confirmVerification({
        orderId: order.orderId,
        medicationDetails,
        status: 'awaiting_payment'
      }),
    onMutate: () => {
      setState(prev => ({ 
        ...prev, 
        isConfirming: true, 
        isLoading: true, 
        errors: {} 
      }));
    },
    onSuccess: (updatedOrder) => {
      setState(prev => ({ 
        ...prev, 
        isConfirming: false, 
        isLoading: false 
      }));
      onSuccess?.(updatedOrder, 'confirm');
    },
    onError: (error: Error) => {
      setState(prev => ({ 
        ...prev, 
        isConfirming: false, 
        isLoading: false,
        errors: { general: error.message || 'Failed to confirm prescription details' }
      }));
      onError?.(error.message || 'Failed to confirm prescription details', 'confirm');
    }
  });

  // Mutation for skipping verification
  const skipMutation = useMutation({
    mutationFn: () => 
      VerificationService.skipVerification({
        orderId: order.orderId,
        status: 'awaiting_payment'
      }),
    onMutate: () => {
      setState(prev => ({ 
        ...prev, 
        isSkipping: true, 
        isLoading: true, 
        errors: {} 
      }));
    },
    onSuccess: (updatedOrder) => {
      setState(prev => ({ 
        ...prev, 
        isSkipping: false, 
        isLoading: false 
      }));
      onSuccess?.(updatedOrder, 'skip');
    },
    onError: (error: Error) => {
      setState(prev => ({ 
        ...prev, 
        isSkipping: false, 
        isLoading: false,
        errors: { general: error.message || 'Failed to send prescription to pharmacist' }
      }));
      onError?.(error.message || 'Failed to send prescription to pharmacist', 'skip');
    }
  });

  const validateMedicationDetails = useCallback((details: MedicationDetails): VerificationErrors => {
    const errors: VerificationErrors = {};

    if (!details.name || details.name.trim() === '') {
      errors.name = 'Medication name is required';
    }

    if (!details.dosage || details.dosage.trim() === '') {
      errors.dosage = 'Dosage is required';
    }

    if (!details.quantity || details.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    return errors;
  }, []);

  const confirmVerification = useCallback((medicationDetails: MedicationDetails) => {
    const validationErrors = validateMedicationDetails(medicationDetails);
    
    if (Object.keys(validationErrors).length > 0) {
      setState(prev => ({ ...prev, errors: validationErrors }));
      return;
    }

    confirmMutation.mutate(medicationDetails);
  }, [confirmMutation, validateMedicationDetails]);

  const skipVerification = useCallback(() => {
    skipMutation.mutate();
  }, [skipMutation]);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: {} }));
  }, []);

  return {
    ...state,
    confirmVerification,
    skipVerification,
    clearErrors,
    validateMedicationDetails
  };
};