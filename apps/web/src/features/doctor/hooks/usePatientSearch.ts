import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PatientSearchResult, PatientSearchRequest } from '@pharmarx/shared-types';
import { doctorPrescriptionService } from '../services/doctorPrescriptionService';

export const usePatientSearch = () => {
  const [searchRequest, setSearchRequest] = useState<PatientSearchRequest | null>(null);

  const {
    data: patients = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['patientSearch', searchRequest],
    queryFn: () => {
      if (!searchRequest) return Promise.resolve([]);
      return doctorPrescriptionService.searchPatients(searchRequest);
    },
    enabled: !!searchRequest && searchRequest.query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true
  });

  const searchPatients = (request: PatientSearchRequest) => {
    setSearchRequest(request);
  };

  const clearSearch = () => {
    setSearchRequest(null);
  };

  return {
    patients,
    isLoading,
    error: error ? (error as Error).message : null,
    searchPatients,
    clearSearch,
    refetch
  };
};