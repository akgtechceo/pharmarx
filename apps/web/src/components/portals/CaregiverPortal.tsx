import React, { useState } from 'react';
import PortalLayout from './PortalLayout';
import { PatientInfo, CareTask, CommunicationMessage } from '../../types/portal';
import { PrescriptionUpload } from '../PrescriptionUpload';
import { PrescriptionOrder } from '@pharmarx/shared-types';

// Mock data - in a real app, this would come from an API
const mockPatients: PatientInfo[] = [
  {
    id: '1',
    name: 'Mary Johnson (Mother)',
    age: 78,
    lastVisit: 'Dec 18, 2024',
    status: 'Needs Attention',
    conditions: ['Diabetes Management', 'Blood Pressure Monitoring'],
    medicationsDue: 2
  },
  {
    id: '2', 
    name: 'Robert Johnson (Spouse)',
    age: 81,
    lastVisit: 'Dec 15, 2024',
    status: 'Up to Date',
    conditions: ['Heart Medication', 'Physical Therapy']
  },
  {
    id: '3',
    name: 'Emma Thompson (Daughter)',
    age: 45,
    lastVisit: 'Nov 30, 2024',
    status: 'Appointment Needed',
    conditions: ['Anxiety Management', 'Sleep Disorder']
  }
];

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

  const handleUploadComplete = (order: PrescriptionOrder) => {
    setShowUploadModal(false);
    // TODO: Refresh prescription history or show success message
    console.log('Prescription uploaded successfully:', order);
  };

  const welcomeMessage = {
    title: 'Welcome, Caregiver!',
    description: 'Your care coordination dashboard. Manage multiple patients, track their medications, and coordinate with healthcare providers.',
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
      userInfo="Managing: 3 Patients"
      welcomeMessage={welcomeMessage}
    >
      {/* Caregiver Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Patient Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient List Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Patients</h2>
              <button className="text-green-600 hover:text-green-800 text-sm font-medium">Add Patient</button>
            </div>
            <div className="space-y-4">
              {mockPatients.map((patient) => (
                <div key={patient.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{patient.name}</h3>
                        {getStatusBadge(patient.status, patient.medicationsDue)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {patient.age && `Age: ${patient.age} • `}Last visit: {patient.lastVisit}
                      </p>
                      <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                        {patient.conditions.map((condition, index) => (
                          <span key={index}>• {condition}</span>
                        ))}
                      </div>
                    </div>
                    <button className="text-green-600 hover:text-green-800 text-sm font-medium">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Care Coordination */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Care Coordination</h2>
              <button className="text-green-600 hover:text-green-800 text-sm font-medium">View All Plans</button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">Mary Johnson - Diabetes Care Plan</h3>
                    <p className="text-sm text-gray-600">Next review: Dec 22, 2024</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Blood sugar monitoring: On track
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                        Medication adherence: Needs attention
                      </div>
                    </div>
                  </div>
                  <button className="text-green-600 hover:text-green-800 text-sm font-medium">Update</button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">Robert Johnson - Heart Health Plan</h3>
                    <p className="text-sm text-gray-600">Next review: Jan 8, 2025</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Medication compliance: Excellent
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Exercise routine: Following plan
                      </div>
                    </div>
                  </div>
                  <button className="text-green-600 hover:text-green-800 text-sm font-medium">Update</button>
                </div>
              </div>
            </div>
          </div>
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
                onClick={() => setShowUploadModal(true)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Patient Prescription
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
    </PortalLayout>
  );
} 