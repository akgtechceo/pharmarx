import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateDoctorPrescriptionInput, DoctorPrescriptionSubmission } from '@pharmarx/shared-types';
import { doctorPrescriptionService } from '../services/doctorPrescriptionService';

export const usePrescriptionSubmission = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: submitPrescription,
    isLoading,
    error,
    reset
  } = useMutation({
    mutationFn: (prescription: CreateDoctorPrescriptionInput) => 
      doctorPrescriptionService.submitPrescription(prescription),
    onSuccess: (data: DoctorPrescriptionSubmission) => {
      // Invalidate and refetch prescription history
      queryClient.invalidateQueries({ queryKey: ['prescriptionHistory'] });
      
      // Invalidate patient search to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['patientSearch'] });
      
      console.log('Prescription submitted successfully:', data);
    },
    onError: (error: Error) => {
      console.error('Error submitting prescription:', error);
    }
  });

  return {
    submitPrescription,
    isLoading,
    error: error ? (error as Error).message : null,
    reset
  };
};