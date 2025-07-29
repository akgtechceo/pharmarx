import React, { useState } from 'react';
import { PatientSearchResult, CreateDoctorPrescriptionInput } from '@pharmarx/shared-types';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface PrescriptionFormProps {
  selectedPatient?: PatientSearchResult;
  onSubmit: (prescription: CreateDoctorPrescriptionInput) => void;
  isLoading?: boolean;
}

interface FormData {
  medicationName: string;
  dosage: string;
  quantity: number;
  instructions: string;
  refillsAuthorized: number;
  prescriptionNotes: string;
}

interface ValidationErrors {
  medicationName?: string;
  dosage?: string;
  quantity?: string;
  instructions?: string;
  refillsAuthorized?: string;
}

export const PrescriptionForm: React.FC<PrescriptionFormProps> = ({
  selectedPatient,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    medicationName: '',
    dosage: '',
    quantity: 1,
    instructions: '',
    refillsAuthorized: 0,
    prescriptionNotes: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate medication name
    if (!formData.medicationName.trim()) {
      newErrors.medicationName = 'Medication name is required';
    } else if (formData.medicationName.trim().length < 2) {
      newErrors.medicationName = 'Medication name must be at least 2 characters';
    }

    // Validate dosage
    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    } else if (!/^\d+(\.\d+)?\s*(mg|g|ml|mcg|units?|tablets?|capsules?|pills?)$/i.test(formData.dosage.trim())) {
      newErrors.dosage = 'Please enter a valid dosage (e.g., "100mg", "5ml", "2 tablets")';
    }

    // Validate quantity
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    } else if (formData.quantity > 1000) {
      newErrors.quantity = 'Quantity cannot exceed 1000';
    }

    // Validate instructions
    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Instructions are required';
    } else if (formData.instructions.trim().length < 10) {
      newErrors.instructions = 'Instructions must be at least 10 characters';
    }

    // Validate refills authorized
    if (formData.refillsAuthorized < 0) {
      newErrors.refillsAuthorized = 'Refills authorized cannot be negative';
    } else if (formData.refillsAuthorized > 12) {
      newErrors.refillsAuthorized = 'Refills authorized cannot exceed 12';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const prescription: CreateDoctorPrescriptionInput = {
      patientProfileId: selectedPatient.profileId,
      medicationDetails: {
        name: formData.medicationName.trim(),
        dosage: formData.dosage.trim(),
        quantity: formData.quantity,
        instructions: formData.instructions.trim(),
        refillsAuthorized: formData.refillsAuthorized
      },
      prescriptionNotes: formData.prescriptionNotes.trim() || undefined
    };

    onSubmit(prescription);
  };

  const handleReset = () => {
    setFormData({
      medicationName: '',
      dosage: '',
      quantity: 1,
      instructions: '',
      refillsAuthorized: 0,
      prescriptionNotes: ''
    });
    setErrors({});
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Prescription Details</h3>
        {selectedPatient && (
          <p className="text-sm text-gray-600 mt-1">
            Prescribing for: {selectedPatient.patientName} ({getAge(selectedPatient.dateOfBirth)} years old)
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {!selectedPatient && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-yellow-800 text-sm">
                Please select a patient before filling out the prescription form.
              </p>
            </div>
          </div>
        )}

        {/* Medication Name */}
        <div>
          <label htmlFor="medicationName" className="block text-sm font-medium text-gray-700 mb-2">
            Medication Name *
          </label>
          <input
            type="text"
            id="medicationName"
            value={formData.medicationName}
            onChange={(e) => handleInputChange('medicationName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.medicationName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Aspirin, Amoxicillin, Lisinopril"
            disabled={!selectedPatient || isLoading}
          />
          {errors.medicationName && (
            <p className="mt-1 text-sm text-red-600">{errors.medicationName}</p>
          )}
        </div>

        {/* Dosage and Quantity Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-2">
              Dosage *
            </label>
            <input
              type="text"
              id="dosage"
              value={formData.dosage}
              onChange={(e) => handleInputChange('dosage', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.dosage ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 100mg, 5ml, 2 tablets"
              disabled={!selectedPatient || isLoading}
            />
            {errors.dosage && (
              <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
            )}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              min="1"
              max="1000"
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={!selectedPatient || isLoading}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
            Instructions *
          </label>
          <textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.instructions ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Take 1 tablet daily with food. Do not take on an empty stomach."
            disabled={!selectedPatient || isLoading}
          />
          {errors.instructions && (
            <p className="mt-1 text-sm text-red-600">{errors.instructions}</p>
          )}
        </div>

        {/* Refills Authorized */}
        <div>
          <label htmlFor="refillsAuthorized" className="block text-sm font-medium text-gray-700 mb-2">
            Refills Authorized
          </label>
          <input
            type="number"
            id="refillsAuthorized"
            value={formData.refillsAuthorized}
            onChange={(e) => handleInputChange('refillsAuthorized', parseInt(e.target.value) || 0)}
            min="0"
            max="12"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.refillsAuthorized ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={!selectedPatient || isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Number of refills allowed (0-12)
          </p>
          {errors.refillsAuthorized && (
            <p className="mt-1 text-sm text-red-600">{errors.refillsAuthorized}</p>
          )}
        </div>

        {/* Prescription Notes */}
        <div>
          <label htmlFor="prescriptionNotes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            id="prescriptionNotes"
            value={formData.prescriptionNotes}
            onChange={(e) => handleInputChange('prescriptionNotes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional notes or special instructions for the pharmacist..."
            disabled={!selectedPatient || isLoading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={!selectedPatient || isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                <span>Submit Prescription</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};