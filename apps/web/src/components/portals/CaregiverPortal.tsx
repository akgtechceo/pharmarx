import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import { PatientInfo, CareTask, CommunicationMessage } from '../../types/portal';
import { PrescriptionUpload } from '../PrescriptionUpload';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import { AuthenticationService } from '../../services/authenticationService';
import { 
  ProfileSelector, 
  AddProfileModal, 
  ProfileCard, 
  ProfileEditModal 
} from '../../features/profiles/components';
import { 
  usePatientProfiles, 
  useCreateProfile, 
  useUpdateProfile, 
  useDeleteProfile,
  useProfileContext,
  useAutoProfileSelection
} from '../../features/profiles/hooks';
import { CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';

// Mock data - in a real app, this would come from an API
const mockTasks: CareTask[] = [
  { id: '1', description: 'Remind Mary to take morning insulin', completed: false },
  { id: '2', description: 'Call Dr. Smith about Robert\'s BP', completed: true },
  { id: '3', description: 'Schedule Emma\'s therapy appointment', completed: false },
  { id: '4', description: 'Pick up prescriptions from CVS', completed: false }
];

const mockMessages: CommunicationMessage[] = [
  {
    from: 'Dr. Smith',
    message: 'Mary\'s test results are ready',
    timestamp: '2h ago',
    priority: 'high'
  },
  {
    from: 'CVS Pharmacy',
    message: 'Robert\'s prescription is ready',
    timestamp: '4h ago',
    priority: 'normal'
  }
];

export default function CaregiverPortal() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  
  const navigate = useNavigate();
  const authService = AuthenticationService.getInstance();

  // Logout handler
  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to home for security
      navigate('/');
    }
  };

  // Profile click handler - could open a profile modal or navigate to profile page
  const handleProfileClick = () => {
    // For now, just toggle the add profile modal as a placeholder
    setShowAddProfileModal(true);
  };

  // Profile management hooks
  const { data: profilesData, isLoading: profilesLoading, error: profilesError } = usePatientProfiles();
  const createProfileMutation = useCreateProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  
  // Profile context
  const {
    activeProfileId,
    activeProfile,
    profiles,
    setActiveProfile,
    setProfiles,
    hasActiveProfile,
    hasProfiles,
    isProfileActive
  } = useProfileContext();

  // Auto-profile selection
  useAutoProfileSelection();

  // Update profiles in context when data changes
  useEffect(() => {
    if (profilesData?.data?.profiles) {
      setProfiles(profilesData.data.profiles);
    }
  }, [profilesData, setProfiles]);

  const handleUploadComplete = (order: PrescriptionOrder) => {
    setShowUploadModal(false);
    // TODO: Refresh prescription history or show success message
    console.log('Prescription uploaded successfully:', order);
  };

  const handleAddProfile = async (profileData: CreateProfileRequest) => {
    try {
      await createProfileMutation.mutateAsync(profileData);
      setShowAddProfileModal(false);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleEditProfile = async (profileId: string, profileData: UpdateProfileRequest) => {
    try {
      await updateProfileMutation.mutateAsync({ profileId, profileData });
      setShowEditProfileModal(false);
      setEditingProfile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      try {
        await deleteProfileMutation.mutateAsync(profileId);
      } catch (error) {
        console.error('Error deleting profile:', error);
      }
    }
  };

  const handleProfileSelect = (profileId: string) => {
    setActiveProfile(profileId);
  };

  const handleEditProfileClick = (profileId: string) => {
    const profile = profiles.find(p => p.profileId === profileId);
    setEditingProfile(profile || null);
    setShowEditProfileModal(true);
  };

  const welcomeMessage = {
    title: 'Welcome, Caregiver!',
    description: `Your care coordination dashboard. ${hasActiveProfile() ? `Currently managing: ${activeProfile?.patientName}` : 'Select a patient profile to get started.'}`,
    icon: '👥',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  };

  const getStatusBadge = (status: string, medicationsDue?: number) => {
    switch (status) {
      case 'Needs Attention':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{medicationsDue} Medications Due</span>;
      case 'Up to Date':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">All Up to Date</span>;
      case 'Appointment Needed':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Appointment Needed</span>;
      default:
        return null;
    }
  };

  return (
    <PortalLayout
      title="Caregiver Portal"
      brandColor="text-green-600"
      userInfo={`Managing: ${profiles.length} Patients`}
      welcomeMessage={welcomeMessage}
      onLogout={handleLogout}
      onProfileClick={handleProfileClick}
    >
      {/* Profile Selection Reminder */}
      {!hasActiveProfile() && profiles.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Profile Selection Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please select a patient profile to upload prescriptions and access care coordination features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Selector */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Patient Profile</h2>
            <button 
              onClick={() => setShowAddProfileModal(true)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Add New Profile
            </button>
          </div>
          <ProfileSelector
            profiles={profiles}
            activeProfileId={activeProfileId || undefined}
            onProfileSelect={handleProfileSelect}
            onAddProfile={() => setShowAddProfileModal(true)}
            onEditProfile={handleEditProfileClick}
            isLoading={profilesLoading}
          />
        </div>
      </div>

      {/* Caregiver Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Patient Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Management Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Patient Profiles</h2>
              <button 
                onClick={() => setShowAddProfileModal(true)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Add Patient
              </button>
            </div>
            
            {profilesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : profilesError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Error loading profiles. Please try again.</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No patient profiles yet.</p>
                <button 
                  onClick={() => setShowAddProfileModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Add Your First Patient
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.profileId}
                    profile={profile}
                    isActive={isProfileActive(profile.profileId)}
                    onSelect={() => handleProfileSelect(profile.profileId)}
                    onEdit={() => handleEditProfileClick(profile.profileId)}
                    onDelete={() => handleDeleteProfile(profile.profileId)}
                    isDeleting={deleteProfileMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Care Coordination - Only show if active profile */}
          {hasActiveProfile() && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Care Coordination - {activeProfile?.patientName}
                </h2>
                <button className="text-green-600 hover:text-green-800 text-sm font-medium">View All Plans</button>
              </div>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{activeProfile?.patientName} - Care Plan</h3>
                      <p className="text-sm text-gray-600">Next review: Dec 22, 2024</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Medication management: On track
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          Appointment scheduling: Needs attention
                        </div>
                      </div>
                    </div>
                    <button className="text-green-600 hover:text-green-800 text-sm font-medium">Update</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Daily Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today&apos;s Tasks</h2>
            <div className="space-y-3">
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    className="rounded text-green-600" 
                    readOnly
                  />
                  <span className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {task.description}
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 border border-green-600 text-green-600 py-2 px-4 rounded-md hover:bg-green-50">
              Add New Task
            </button>
          </div>

          {/* Communication Center */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Messages</h2>
            <div className="space-y-3">
              {mockMessages.map((message, index) => (
                <div key={index} className={`${
                  message.priority === 'high' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-green-50 border border-green-200'
                } rounded-lg p-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">{message.from}</h4>
                      <p className="text-xs text-gray-600">{message.message}</p>
                    </div>
                    <span className={`text-xs ${
                      message.priority === 'high' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
              View All Messages
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  if (hasActiveProfile()) {
                    setShowUploadModal(true);
                  } else {
                    // Show profile selection prompt
                    setShowAddProfileModal(true);
                  }
                }}
                disabled={!hasActiveProfile()}
                className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
                  hasActiveProfile()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!hasActiveProfile() ? "Please select a patient profile first" : "Upload prescription for selected patient"}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {hasActiveProfile() ? `Upload for ${activeProfile?.patientName}` : 'Select Patient to Upload'}
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Emergency Contact List
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Schedule Group Appointment
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Request Care Plan Review
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Contact Insurance
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PrescriptionUpload
              onUploadComplete={handleUploadComplete}
              onCancel={() => setShowUploadModal(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      <AddProfileModal
        isOpen={showAddProfileModal}
        onClose={() => setShowAddProfileModal(false)}
        onSubmit={handleAddProfile}
        isLoading={createProfileMutation.isPending}
      />

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={showEditProfileModal}
        onClose={() => {
          setShowEditProfileModal(false);
          setEditingProfile(null);
        }}
        onSubmit={handleEditProfile}
        profile={editingProfile}
        isLoading={updateProfileMutation.isPending}
      />
    </PortalLayout>
  );
} 