import React, { useState } from 'react';
import { PatientProfile } from '@pharmarx/shared-types';
import { ChevronDownIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

interface ProfileSelectorProps {
  profiles: PatientProfile[];
  activeProfileId?: string;
  onProfileSelect: (profileId: string) => void;
  onAddProfile: () => void;
  onEditProfile: (profileId: string) => void;
  isLoading?: boolean;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfileId,
  onProfileSelect,
  onAddProfile,
  onEditProfile,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeProfile = profiles.find(profile => profile.profileId === activeProfileId);
  const hasProfiles = profiles.length > 0;

  const handleProfileSelect = (profileId: string) => {
    onProfileSelect(profileId);
    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAge = (dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div className="bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm">
          <div className="animate-pulse flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
        {/* Main Selector Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
          disabled={!hasProfiles}
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {activeProfile ? activeProfile.patientName.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {activeProfile ? (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activeProfile.patientName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getAge(activeProfile.dateOfBirth)} years old
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {hasProfiles ? 'Select a profile' : 'No profiles available'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeProfile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProfile(activeProfile.profileId);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                title="Edit profile"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="py-1">
              {/* Add Profile Option */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddProfile();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-blue-50 focus:outline-none focus:bg-blue-50"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <PlusIcon className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">Add New Profile</span>
              </button>

              {/* Profile List */}
              {profiles.map((profile) => (
                <button
                  key={profile.profileId}
                  type="button"
                  onClick={() => handleProfileSelect(profile.profileId)}
                  className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    profile.profileId === activeProfileId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      profile.profileId === activeProfileId ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <span className={`font-medium text-sm ${
                        profile.profileId === activeProfileId ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {profile.patientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      profile.profileId === activeProfileId ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {profile.patientName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getAge(profile.dateOfBirth)} years old • {formatDate(profile.dateOfBirth)}
                    </p>
                  </div>
                  {profile.profileId === activeProfileId && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for closing dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfileSelector;