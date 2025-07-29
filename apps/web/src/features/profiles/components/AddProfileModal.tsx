import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CreateProfileRequest } from '@pharmarx/shared-types';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (profileData: CreateProfileRequest) => Promise<void>;
  isLoading?: boolean;
}

export const AddProfileModal: React.FC<AddProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateProfileRequest>({
    patientName: '',
    dateOfBirth: '',
    insuranceDetails: {
      provider: '',
      policyNumber: ''
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [includeInsurance, setIncludeInsurance] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleInsuranceChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      insuranceDetails: {
        ...prev.insuranceDetails!,
        [field]: value
      }
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const date = new Date(formData.dateOfBirth);
      if (isNaN(date.getTime())) {
        newErrors.dateOfBirth = 'Please enter a valid date';
      } else if (date > new Date()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (includeInsurance) {
      if (!formData.insuranceDetails?.provider?.trim()) {
        newErrors.insuranceProvider = 'Insurance provider is required';
      }
      if (!formData.insuranceDetails?.policyNumber?.trim()) {
        newErrors.insurancePolicyNumber = 'Policy number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        insuranceDetails: includeInsurance ? formData.insuranceDetails : undefined
      };
      
      await onSubmit(submitData);
      
      // Reset form on success
      setFormData({
        patientName: '',
        dateOfBirth: '',
        insuranceDetails: {
          provider: '',
          policyNumber: ''
        }
      });
      setIncludeInsurance(false);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        patientName: '',
        dateOfBirth: '',
        insuranceDetails: {
          provider: '',
          policyNumber: ''
        }
      });
      setIncludeInsurance(false);
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Add New Patient Profile
              </h3>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient Name */}
              <div>
                <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => handleInputChange('patientName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.patientName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter patient's full name"
                  disabled={isLoading}
                />
                {errors.patientName && (
                  <p className="mt-1 text-sm text-red-600">{errors.patientName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Insurance Details Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeInsurance"
                  checked={includeInsurance}
                  onChange={(e) => setIncludeInsurance(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeInsurance" className="ml-2 block text-sm text-gray-900">
                  Include insurance information
                </label>
              </div>

              {/* Insurance Details */}
              {includeInsurance && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label htmlFor="insuranceProvider" className="block text-sm font-medium text-gray-700 mb-1">
                      Insurance Provider *
                    </label>
                    <input
                      type="text"
                      id="insuranceProvider"
                      value={formData.insuranceDetails?.provider || ''}
                      onChange={(e) => handleInsuranceChange('provider', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.insuranceProvider ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter insurance provider name"
                      disabled={isLoading}
                    />
                    {errors.insuranceProvider && (
                      <p className="mt-1 text-sm text-red-600">{errors.insuranceProvider}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="policyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Policy Number *
                    </label>
                    <input
                      type="text"
                      id="policyNumber"
                      value={formData.insuranceDetails?.policyNumber || ''}
                      onChange={(e) => handleInsuranceChange('policyNumber', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.insurancePolicyNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter policy number"
                      disabled={isLoading}
                    />
                    {errors.insurancePolicyNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.insurancePolicyNumber}</p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Profile'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProfileModal;