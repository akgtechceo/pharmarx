import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PatientProfile, 
  CreateProfileRequest, 
  UpdateProfileRequest,
  ProfileManagementResponse 
} from '@pharmarx/shared-types';
import { auth } from '../../../config/firebase';
import { useAuthStore } from '../../../stores/authStore';
import { getValidAuthToken, handleAuthError } from '../../../utils/authUtils';

// API functions
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/profiles`;

// Helper function to get authentication headers
const getAuthHeaders = async () => {
  try {
    const token = await getValidAuthToken();
    if (!token) {
      throw new Error('User not authenticated. Please log in to access profiles.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch (error) {
    console.error('Failed to get authentication token:', error);
    if (error instanceof Error) {
      handleAuthError(error);
    }
    throw new Error('Authentication failed. Please log in again.');
  }
};

const fetchProfiles = async (): Promise<ProfileManagementResponse> => {
  const headers = await getAuthHeaders();
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Try to parse error response, but don't fail if it's not JSON
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    throw new Error('Failed to fetch profiles. Please try again later.');
  }
};

const createProfile = async (profileData: CreateProfileRequest): Promise<PatientProfile> => {
  const headers = await getAuthHeaders();
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      // Try to parse error response, but don't fail if it's not JSON
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to create profile:', error);
    throw new Error('Failed to create profile. Please try again later.');
  }
};

const updateProfile = async ({ 
  profileId, 
  profileData 
}: { 
  profileId: string; 
  profileData: UpdateProfileRequest 
}): Promise<PatientProfile> => {
  const headers = await getAuthHeaders();
  
  try {
    const response = await fetch(`${API_BASE_URL}/${profileId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      // Try to parse error response, but don't fail if it's not JSON
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw new Error('Failed to update profile. Please try again later.');
  }
};

const deleteProfile = async (profileId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  
  try {
    const response = await fetch(`${API_BASE_URL}/${profileId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      // Try to parse error response, but don't fail if it's not JSON
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to delete profile:', error);
    throw new Error('Failed to delete profile. Please try again later.');
  }
};

// Query keys
export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: string) => [...profileKeys.lists(), { filters }] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
};

// Main hook for fetching profiles
export const usePatientProfiles = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  return useQuery({
    queryKey: profileKeys.lists(),
    queryFn: fetchProfiles,
    enabled: isAuthenticated && !authLoading, // Only fetch if authenticated and auth is not loading
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for creating a profile
export const useCreateProfile = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      // Invalidate and refetch profiles list
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating profile:', error);
    },
    onMutate: () => {
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }
    },
  });
};

// Hook for updating a profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedProfile) => {
      // Update the specific profile in cache
      queryClient.setQueryData(
        profileKeys.detail(updatedProfile.profileId),
        updatedProfile
      );
      
      // Invalidate and refetch profiles list
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
    },
    onMutate: () => {
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }
    },
  });
};

// Hook for deleting a profile
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: (_, deletedProfileId) => {
      // Remove the specific profile from cache
      queryClient.removeQueries({ queryKey: profileKeys.detail(deletedProfileId) });
      
      // Invalidate and refetch profiles list
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
    onError: (error) => {
      console.error('Error deleting profile:', error);
    },
    onMutate: () => {
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }
    },
  });
};

// Hook for checking if a profile exists
export const useProfileExists = (profileId: string) => {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  return useQuery({
    queryKey: profileKeys.detail(profileId),
    queryFn: async () => {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/${profileId}/exists`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check profile existence');
      }

      const result = await response.json();
      return result.data.exists;
    },
    enabled: !!profileId && isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Utility hook for optimistic updates
export const useOptimisticProfileUpdate = () => {
  const queryClient = useQueryClient();

  const updateOptimistically = (
    profileId: string,
    updates: Partial<PatientProfile>
  ) => {
    queryClient.setQueryData(
      profileKeys.lists(),
      (oldData: ProfileManagementResponse | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          profiles: oldData.profiles.map(profile =>
            profile.profileId === profileId
              ? { ...profile, ...updates }
              : profile
          ),
        };
      }
    );
  };

  return { updateOptimistically };
};