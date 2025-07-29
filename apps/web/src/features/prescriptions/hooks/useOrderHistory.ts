import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { useProfileValidation } from '../../../features/profiles/hooks';
import { OrderHistoryResponse } from '@pharmarx/shared-types';

interface UseOrderHistoryOptions {
  page: number;
  limit: number;
}

const fetchOrderHistory = async (
  patientProfileId: string,
  page: number,
  limit: number
): Promise<OrderHistoryResponse> => {
  const response = await fetch(
    `/api/orders/history?patientProfileId=${patientProfileId}&page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

export const useOrderHistory = (page: number, limit: number) => {
  const { user } = useAuthStore();
  const { hasValidActiveProfile } = useProfileValidation();

  return useQuery({
    queryKey: ['orderHistory', 'profile', page, limit],
    queryFn: () => {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }
      
      if (!hasValidActiveProfile) {
        throw new Error('No active profile selected');
      }

      // Get the active profile from the validation hook
      const { requireActiveProfile } = useProfileValidation();
      const activeProfile = requireActiveProfile();
      
      return fetchOrderHistory(activeProfile.profileId, page, limit);
    },
    enabled: !!user?.uid && hasValidActiveProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: true,
    retry: (failureCount, error) => {
      // Don't retry on authentication or profile errors
      if (error.message === 'User not authenticated' || error.message === 'No active profile selected') {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};