import React from 'react';
import { PatientProfile } from '@pharmarx/shared-types';
import { PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';

interface ProfileCardProps {
  profile: PatientProfile;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  isDeleting = false
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const formatCreatedDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${
      isActive ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <UserIcon className={`h-5 w-5 ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isActive ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {profile.patientName}
              </h3>
              <p className="text-sm text-gray-500">
                {getAge(profile.dateOfBirth)} years old
              </p>
            </div>
          </div>
          
          {/* Active indicator */}
          {isActive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-xs font-medium text-blue-600">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Date of Birth */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Date of Birth:</span>
          <span className="text-sm text-gray-900">{formatDate(profile.dateOfBirth)}</span>
        </div>

        {/* Insurance Information */}
        {profile.insuranceDetails && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Insurance Provider:</span>
              <span className="text-sm text-gray-900">{profile.insuranceDetails.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Policy Number:</span>
              <span className="text-sm text-gray-900 font-mono">{profile.insuranceDetails.policyNumber}</span>
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Created:</span>
          <span className="text-xs text-gray-500">{formatCreatedDate(profile.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSelect}
            disabled={isActive}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isActive ? 'Currently Active' : 'Select Profile'}
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              title="Edit profile"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className={`p-1.5 transition-colors focus:outline-none ${
                isDeleting
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-600 focus:text-red-600'
              }`}
              title="Delete profile"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay for delete operation */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            <span className="text-sm text-gray-600">Deleting...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;