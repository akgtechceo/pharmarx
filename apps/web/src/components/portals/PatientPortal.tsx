import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import { MedicationInfo, AppointmentInfo, HealthMetric } from '../../types/portal';
import { PrescriptionUpload } from '../PrescriptionUpload';
import { PrescriptionOrder } from '@pharmarx/shared-types';

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
  const navigate = useNavigate();

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
    >
      {/* Patient Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Medications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Medications</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {mockMedications.map((medication, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{medication.name}</h3>
                      <p className="text-sm text-gray-600">{medication.instructions}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Prescribed by {medication.prescribedBy} - Refills: {medication.refillsRemaining} remaining
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      medication.status === 'Active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {medication.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Prescription History</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Full History</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <h4 className="font-medium text-gray-900">Metformin 500mg</h4>
                  <p className="text-sm text-gray-600">Filled at CVS Pharmacy - Dec 15, 2024</p>
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