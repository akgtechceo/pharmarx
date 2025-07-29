import React, { useState } from 'react';
import { PatientSearchResult, CreateDoctorPrescriptionInput, DoctorPrescriptionSubmission } from '@pharmarx/shared-types';
import { PatientSearch } from './PatientSearch';
import { PrescriptionForm } from './PrescriptionForm';
import { usePrescriptionSubmission } from '../hooks/usePrescriptionSubmission';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const DoctorPrescriptionPortal: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    submitPrescription,
    isLoading,
    error
  } = usePrescriptionSubmission();

  const handlePatientSelect = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    // Clear any previous notifications
    setShowSuccess(false);
    setShowError(false);
  };

  const handlePrescriptionSubmit = async (prescription: CreateDoctorPrescriptionInput) => {
    try {
      const result = await submitPrescription(prescription);
      setShowSuccess(true);
      setShowError(false);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Reset form by clearing selected patient
      setSelectedPatient(undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit prescription');
      setShowError(true);
      setShowSuccess(false);
      
      // Auto-hide error message after 8 seconds
      setTimeout(() => setShowError(false), 8000);
    }
  };

  const dismissNotification = (type: 'success' | 'error') => {
    if (type === 'success') {
      setShowSuccess(false);
    } else {
      setShowError(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Prescription Portal</h1>
        <p className="mt-2 text-gray-600">
          Search for patients and submit prescriptions securely
        </p>
      </div>

      {/* Notifications */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-green-800 font-medium">
                Prescription submitted successfully!
              </p>
            </div>
            <button
              onClick={() => dismissNotification('success')}
              className="text-green-400 hover:text-green-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-green-700 text-sm mt-1">
            The prescription has been sent to the pharmacy for processing. The patient will be notified.
          </p>
        </div>
      )}

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800 font-medium">
                Error submitting prescription
              </p>
            </div>
            <button
              onClick={() => dismissNotification('error')}
              className="text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-red-700 text-sm mt-1">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Search Section */}
        <div className="space-y-6">
          <PatientSearch
            onPatientSelect={handlePatientSelect}
            selectedPatient={selectedPatient}
          />
        </div>

        {/* Prescription Form Section */}
        <div className="space-y-6">
          <PrescriptionForm
            selectedPatient={selectedPatient}
            onSubmit={handlePrescriptionSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Submit a Prescription</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
              1
            </div>
            <div>
              <p className="font-medium">Search for Patient</p>
              <p>Use the search bar to find your patient by name, phone, or email</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
              2
            </div>
            <div>
              <p className="font-medium">Fill Prescription Details</p>
              <p>Enter medication name, dosage, quantity, and instructions</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
              3
            </div>
            <div>
              <p className="font-medium">Submit & Notify</p>
              <p>Submit the prescription and the patient will be automatically notified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Secure & Compliant</h4>
            <p className="text-sm text-gray-600 mt-1">
              All prescription submissions are encrypted and comply with healthcare privacy regulations. 
              Patient data is protected and prescriptions are securely transmitted to the pharmacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};