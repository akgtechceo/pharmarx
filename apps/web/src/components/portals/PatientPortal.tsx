import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import { MedicationInfo, AppointmentInfo, HealthMetric } from '../../types/portal';
import { PrescriptionFlow } from '../PrescriptionFlow';
import { PrescriptionOrder, CreateProfileRequest, UpdateProfileRequest } from '@pharmarx/shared-types';
import { ProfileSelector } from '../../features/profiles/components/ProfileSelector';
import { AddProfileModal, ProfileEditModal } from '../../features/profiles/components';
import { usePatientProfiles, useCreateProfile, useUpdateProfile, useDeleteProfile } from '../../features/profiles/hooks/usePatientProfiles';
import { useProfileContext } from '../../features/profiles/hooks';
import { AuthenticationService } from '../../services/authenticationService';

// Mock data - in a real app, this would come from an API
const mockMedications: MedicationInfo[] = [
  {
    name: 'Metformin 500mg',
    dosage: '500mg',
    instructions: 'Take twice daily with meals',
    prescribedBy: 'Dr. Smith',
    refillsRemaining: 2,
    status: 'Active'
  },
  {
    name: 'Lisinopril 10mg',
    dosage: '10mg',
    instructions: 'Take once daily in morning',
    prescribedBy: 'Dr. Johnson',
    refillsRemaining: 1,
    status: 'Refill Soon'
  }
];

const mockAppointments: AppointmentInfo[] = [
  {
    doctorName: 'Dr. Smith',
    type: 'Diabetes Check-up',
    date: 'Dec 22, 2024',
    time: '2:00 PM'
  },
  {
    doctorName: 'Dr. Johnson',
    type: 'Blood Pressure Follow-up',
    date: 'Jan 5, 2025',
    time: '10:30 AM'
  }
];

const mockHealthMetrics: HealthMetric[] = [
  {
    name: 'Blood Pressure',
    value: '120/80',
    lastUpdated: 'Dec 18, 2024',
    status: 'normal'
  },
  {
    name: 'Blood Sugar',
    value: '95',
    unit: 'mg/dL',
    lastUpdated: 'Dec 19, 2024',
    status: 'normal'
  }
];

export default function PatientPortal() {
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
  const { data: profilesData, isLoading: profilesLoading } = usePatientProfiles();
  const createProfileMutation = useCreateProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  
  // Profile context
  const {
    activeProfileId,
    profiles,
    setActiveProfile,
    setProfiles,
    hasProfiles
  } = useProfileContext();

  // Auto-profile selection - only auto-select if user has exactly one profile
  useEffect(() => {
    const availableProfiles = profilesData?.profiles || [];
    if (availableProfiles.length === 1 && !activeProfileId) {
      setActiveProfile(availableProfiles[0].profileId);
    }
  }, [profilesData, activeProfileId, setActiveProfile]);

  // Update profiles in context when data changes
  useEffect(() => {
    if (profilesData?.profiles) {
      setProfiles(profilesData.profiles);
    }
  }, [profilesData, setProfiles]);

  const handleUploadComplete = (order: PrescriptionOrder) => {
    setShowUploadModal(false);
    
    // Navigate to verification page if order status is pending_verification
    if (order.status === 'pending_verification') {
      navigate(`/portal/patient/orders/${order.orderId}/verify`, {
        state: { 
          message: 'Prescription uploaded successfully! Please review the extracted details.',
          fromUpload: true
        }
      });
    } else {
      // Handle other statuses (e.g., direct to payment if OCR failed and manual entry was used)
      console.log('Prescription processed with status:', order.status, order);
      // Could navigate to a different page based on status
    }
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
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await deleteProfileMutation.mutateAsync(profileId);
      } catch (error) {
        console.error('Error deleting profile:', error);
      }
    }
  };

  const welcomeMessage = {
    title: 'Welcome back, Patient!',
    description: "Here's your personalized health dashboard. Manage your medications, view appointments, and track your health journey.",
    icon: '👤',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  };

  return (
    <PortalLayout
      title="Patient Portal"
      brandColor="text-blue-600"
      userInfo=""
      welcomeMessage={welcomeMessage}
      onLogout={handleLogout}
      onProfileClick={handleProfileClick}
    >
      {/* Welcome Message for New Users */}
      {(!hasProfiles || profiles.length === 0) && (
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800">Welcome to PharmaRx!</h3>
                <p className="text-sm text-green-700 mt-1">
                  You can start uploading prescriptions right away. Create a profile later to save your information for future orders.
                </p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Upload Prescription Now
                  </button>
                  <button
                    onClick={() => setShowAddProfileModal(true)}
                    className="border border-green-600 text-green-600 px-3 py-1 rounded text-sm hover:bg-green-50"
                  >
                    Create Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Management - Only show when user has multiple profiles or wants to manage them */}
      {hasProfiles && profiles.length > 1 && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile Management</h2>
              <button
                onClick={() => setShowAddProfileModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add Profile
              </button>
            </div>
            <ProfileSelector
              profiles={profiles}
              activeProfileId={activeProfileId}
              onProfileSelect={setActiveProfile}
              onAddProfile={() => setShowAddProfileModal(true)}
              isLoading={profilesLoading}
            />
          </div>
        </div>
      )}

      {/* Patient Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Medications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Medications</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {mockMedications.map((medication, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{medication.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      medication.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {medication.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{medication.instructions}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Prescribed by {medication.prescribedBy}</span>
                    <span>{medication.refillsRemaining} refills remaining</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <h4 className="font-medium text-gray-900">Metformin 500mg</h4>
                  <p className="text-sm text-gray-600">Filled at Walgreens - Dec 10, 2024</p>
                </div>
                <span className="text-green-600 text-sm font-medium">Completed</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <h4 className="font-medium text-gray-900">Lisinopril 10mg</h4>
                  <p className="text-sm text-gray-600">Filled at Walgreens - Dec 10, 2024</p>
                </div>
                <span className="text-green-600 text-sm font-medium">Completed</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <h4 className="font-medium text-gray-900">Amoxicillin 500mg</h4>
                  <p className="text-sm text-gray-600">Filled at CVS Pharmacy - Nov 28, 2024</p>
                </div>
                <span className="text-green-600 text-sm font-medium">Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
            <div className="space-y-4">
              {mockAppointments.map((appointment, index) => (
                <div key={index} className={`border-l-4 ${index === 0 ? 'border-blue-500' : 'border-green-500'} pl-4`}>
                  <h3 className="font-medium text-gray-900">{appointment.doctorName}</h3>
                  <p className="text-sm text-gray-600">{appointment.type}</p>
                  <p className="text-xs text-gray-500">{appointment.date} at {appointment.time}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Schedule New Appointment
            </button>
          </div>

          {/* Health Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Tracking</h2>
            <div className="space-y-4">
              {mockHealthMetrics.map((metric, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700">{metric.name}</h3>
                  <p className={`text-2xl font-bold ${
                    metric.status === 'normal' 
                      ? index === 0 ? 'text-blue-600' : 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {metric.value}{metric.unit && ` ${metric.unit}`}
                  </p>
                  <p className="text-xs text-gray-500">Last updated: {metric.lastUpdated}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 border border-blue-600 text-blue-600 py-2 px-4 rounded-md hover:bg-blue-50">
              View All Metrics
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setShowUploadModal(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
                title="Upload prescription and select pharmacy"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload New Prescription
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Request Prescription Refill
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Message My Doctor
              </button>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
                Update Insurance Info
              </button>
              <button 
                onClick={() => navigate('/map-demo')}
                className="w-full border border-blue-300 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-50 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                View Pharmacy Map
              </button>
              <button 
                onClick={() => setShowAddProfileModal(true)}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Manage Profiles
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PrescriptionFlow
              onCancel={() => setShowUploadModal(false)}
              onUploadComplete={handleUploadComplete}
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
        profile={editingProfile}
        onClose={() => {
          setShowEditProfileModal(false);
          setEditingProfile(null);
        }}
        onSubmit={(profileData) => editingProfile && handleEditProfile(editingProfile.profileId, profileData)}
        onDelete={(profileId) => handleDeleteProfile(profileId)}
        isLoading={updateProfileMutation.isPending || deleteProfileMutation.isPending}
      />
    </PortalLayout>
  );
} 