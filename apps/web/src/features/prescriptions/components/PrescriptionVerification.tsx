import React, { useState } from 'react';
import { PrescriptionOrder, MedicationDetails } from '@pharmarx/shared-types';
import { useOrderVerification } from '../hooks/useOrderVerification';
import { VerificationActionType } from '../types/verification.types';

interface PrescriptionVerificationProps {
  order: PrescriptionOrder;
  onComplete: (updatedOrder: PrescriptionOrder, actionType: VerificationActionType) => void;
  onError?: (error: string, actionType: VerificationActionType) => void;
}

export const PrescriptionVerification: React.FC<PrescriptionVerificationProps> = ({
  order,
  onComplete,
  onError
}) => {
  const [editableDetails, setEditableDetails] = useState<MedicationDetails>({
    name: order.medicationDetails?.name || '',
    dosage: order.medicationDetails?.dosage || '',
    quantity: order.medicationDetails?.quantity || 0
  });

  const {
    isLoading,
    isConfirming,
    isSkipping,
    errors,
    confirmVerification,
    skipVerification,
    clearErrors
  } = useOrderVerification({
    order,
    onSuccess: onComplete,
    onError
  });

  const handleFieldChange = (field: keyof MedicationDetails, value: string | number) => {
    setEditableDetails(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      clearErrors();
    }
  };

  const handleConfirm = () => {
    confirmVerification(editableDetails);
  };

  const handleSkip = () => {
    skipVerification();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Prescription Details</h2>
      
      {/* General Error Message */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Prescription Image */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Original Prescription</h3>
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <img
              src={order.originalImageUrl}
              alt="Prescription"
              className="w-full h-auto max-h-96 object-contain rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-prescription.png';
              }}
            />
          </div>
          
          {/* OCR Status Information */}
          {order.extractedText && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-blue-800">OCR Extracted Text:</p>
              <p className="mt-1 italic">"{order.extractedText}"</p>
              {order.ocrProcessedAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Processed: {new Date(order.ocrProcessedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Editable Details */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">Medication Details</h3>
          
          <div className="space-y-4">
            {/* Medication Name */}
            <div>
              <label htmlFor="medication-name" className="block text-sm font-medium text-gray-700 mb-1">
                Medication Name *
              </label>
              <input
                id="medication-name"
                type="text"
                value={editableDetails.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter medication name"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Dosage */}
            <div>
              <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-1">
                Dosage *
              </label>
              <input
                id="dosage"
                type="text"
                value={editableDetails.dosage}
                onChange={(e) => handleFieldChange('dosage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dosage ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 500mg, 10ml"
                disabled={isLoading}
              />
              {errors.dosage && (
                <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={editableDetails.quantity}
                onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter quantity"
                disabled={isLoading}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-6 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                isConfirming 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isConfirming ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Confirming...
                </div>
              ) : (
                'Confirm Details'
              )}
            </button>
            
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className={`flex-1 py-3 px-6 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSkipping 
                  ? 'bg-gray-500 text-white' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {isSkipping ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </div>
              ) : (
                'Skip & Send to Pharmacist'
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 text-center">
            <span className="font-medium">Confirm Details:</span> Review and edit the information extracted from your prescription.<br/>
            <span className="font-medium">Skip & Send:</span> Send the prescription directly to the pharmacist for manual review.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionVerification;