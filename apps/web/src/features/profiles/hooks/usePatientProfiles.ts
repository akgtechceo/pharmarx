import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PatientProfile, 
  CreateProfileRequest, 
  UpdateProfileRequest,
  ProfileManagementResponse 
} from '@pharmarx/shared-types';

// API functions
const API_BASE_URL = '/api/profiles';

const fetchProfiles = async (): Promise<ProfileManagementResponse> => {
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch profiles');
  }

  return response.json();
};

const createProfile = async (profileData: CreateProfileRequest): Promise<PatientProfile> => {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create profile');
  }

  const result = await response.json();
  return result.data;
};

const updateProfile = async ({ 
  profileId, 
  profileData 
}: { 
  profileId: string; 
  profileData: UpdateProfileRequest 
}): Promise<PatientProfile> => {
  const response = await fetch(`${API_BASE_URL}/${profileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile');
  }

  const result = await response.json();
  return result.data;
};

const deleteProfile = async (profileId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/${profileId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete profile');
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
  return useQuery({
    queryKey: profileKeys.lists(),
    queryFn: fetchProfiles,
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

  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      // Invalidate and refetch profiles list
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating profile:', error);
    },
  });
};

// Hook for updating a profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

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
  });
};

// Hook for deleting a profile
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();

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
  });
};

// Hook for checking if a profile exists
export const useProfileExists = (profileId: string) => {
  return useQuery({
    queryKey: profileKeys.detail(profileId),
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/${profileId}/exists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check profile existence');
      }

      const result = await response.json();
      return result.data.exists;
    },
    enabled: !!profileId,
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