import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PatientProfile } from '@pharmarx/shared-types';

interface ProfileSelectorState {
  activeProfileId: string | null;
  profiles: PatientProfile[];
  setActiveProfile: (profileId: string | null) => void;
  setProfiles: (profiles: PatientProfile[]) => void;
  clearActiveProfile: () => void;
  getActiveProfile: () => PatientProfile | null;
  hasActiveProfile: () => boolean;
  hasProfiles: () => boolean;
}

export const useProfileSelector = create<ProfileSelectorState>()(
  persist(
    (set, get) => ({
      activeProfileId: null,
      profiles: [],

      setActiveProfile: (profileId: string | null) => {
        set({ activeProfileId: profileId });
      },

      setProfiles: (profiles: PatientProfile[]) => {
        const { activeProfileId } = get();
        
        // If current active profile doesn't exist in new profiles, clear it
        if (activeProfileId && !profiles.find(p => p.profileId === activeProfileId)) {
          set({ profiles, activeProfileId: null });
        } else {
          set({ profiles });
        }
      },

      clearActiveProfile: () => {
        set({ activeProfileId: null });
      },

      getActiveProfile: () => {
        const { activeProfileId, profiles } = get();
        if (!activeProfileId) return null;
        return profiles.find(profile => profile.profileId === activeProfileId) || null;
      },

      hasActiveProfile: () => {
        const { activeProfileId, profiles } = get();
        if (!activeProfileId) return false;
        return profiles.some(profile => profile.profileId === activeProfileId);
      },

      hasProfiles: () => {
        const { profiles } = get();
        return profiles.length > 0;
      },
    }),
    {
      name: 'profile-selector-storage',
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);

// Hook for automatic profile selection when profiles change
export const useAutoProfileSelection = () => {
  const { profiles, activeProfileId, setActiveProfile, hasActiveProfile } = useProfileSelector();

  // Auto-select first profile if no active profile and profiles exist
  if (profiles.length > 0 && !hasActiveProfile()) {
    setActiveProfile(profiles[0].profileId);
  }

  // Clear active profile if no profiles exist
  if (profiles.length === 0 && activeProfileId) {
    setActiveProfile(null);
  }
};

// Hook for profile context provider
export const useProfileContext = () => {
  const {
    activeProfileId,
    profiles,
    setActiveProfile,
    setProfiles,
    clearActiveProfile,
    getActiveProfile,
    hasActiveProfile,
    hasProfiles,
  } = useProfileSelector();

  const activeProfile = getActiveProfile();

  return {
    // State
    activeProfileId,
    activeProfile,
    profiles,
    hasActiveProfile: hasActiveProfile(),
    hasProfiles: hasProfiles(),

    // Actions
    setActiveProfile,
    setProfiles,
    clearActiveProfile,

    // Computed
    isProfileActive: (profileId: string) => activeProfileId === profileId,
    getProfileById: (profileId: string) => profiles.find(p => p.profileId === profileId) || null,
  };
};

// Hook for profile validation
export const useProfileValidation = () => {
  const { activeProfile, hasActiveProfile } = useProfileSelector();

  const validateActiveProfile = () => {
    if (!hasActiveProfile()) {
      throw new Error('No active profile selected');
    }
    return activeProfile!;
  };

  const requireActiveProfile = () => {
    return validateActiveProfile();
  };

  return {
    validateActiveProfile,
    requireActiveProfile,
    hasValidActiveProfile: hasActiveProfile(),
  };
};

// Hook for profile switching with confirmation
export const useProfileSwitcher = () => {
  const { setActiveProfile, activeProfileId } = useProfileSelector();

  const switchProfile = (newProfileId: string, options?: {
    confirm?: boolean;
    onBeforeSwitch?: () => boolean | Promise<boolean>;
    onAfterSwitch?: () => void;
  }) => {
    const { confirm = false, onBeforeSwitch, onAfterSwitch } = options || {};

    const performSwitch = async () => {
      // Check if we need to confirm the switch
      if (confirm && activeProfileId) {
        const confirmed = window.confirm(
          'Switching profiles will change the context for all actions. Continue?'
        );
        if (!confirmed) return;
      }

      // Run before switch hook
      if (onBeforeSwitch) {
        const shouldContinue = await onBeforeSwitch();
        if (!shouldContinue) return;
      }

      // Perform the switch
      setActiveProfile(newProfileId);

      // Run after switch hook
      if (onAfterSwitch) {
        onAfterSwitch();
      }
    };

    performSwitch();
  };

  return { switchProfile };
};