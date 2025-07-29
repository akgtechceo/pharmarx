// TanStack Query hooks
export {
  usePatientProfiles,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
  useProfileExists,
  useOptimisticProfileUpdate,
  profileKeys,
} from './usePatientProfiles';

// Zustand state management hooks
export {
  useProfileSelector,
  useAutoProfileSelection,
  useProfileContext,
  useProfileValidation,
  useProfileSwitcher,
} from './useProfileSelector';