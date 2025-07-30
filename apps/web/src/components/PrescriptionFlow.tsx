import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import { useAuthStore } from '../stores/authStore';
import { PrescriptionUpload } from './PrescriptionUpload';
import PharmacySelectionStep from '../features/prescriptions/components/PharmacySelectionStep';
import { pharmacySelectionService } from '../services/pharmacySelectionService';

type FlowStep = 'upload' | 'pharmacy-selection' | 'verification';

interface PrescriptionFlowProps {
  onCancel?: () => void;
  onUploadComplete?: (order: PrescriptionOrder) => void;
  isModal?: boolean;
}

export const PrescriptionFlow: React.FC<PrescriptionFlowProps> = ({
  onCancel,
  isModal = false
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [prescriptionOrder, setPrescriptionOrder] = useState<PrescriptionOrder | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [isUpdatingPharmacy, setIsUpdatingPharmacy] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleUploadComplete = (order: PrescriptionOrder) => {
    setPrescriptionOrder(order);
    setCurrentStep('pharmacy-selection');
  };

  const handlePharmacySelect = async (pharmacyId: string) => {
    if (!prescriptionOrder || !user) return;

    setIsUpdatingPharmacy(true);
    setPharmacyError(null);

    try {
      const response = await pharmacySelectionService.selectPharmacy({
        orderId: prescriptionOrder.orderId,
        pharmacyId,
        patientId: user.uid
      });

      if (response.success) {
        setSelectedPharmacyId(pharmacyId);
        setPrescriptionOrder(response.order);
        setCurrentStep('verification');
      } else {
        setPharmacyError(response.error || 'Failed to select pharmacy');
      }
    } catch (error) {
      console.error('Pharmacy selection error:', error);
      setPharmacyError('Failed to select pharmacy. Please try again.');
    } finally {
      setIsUpdatingPharmacy(false);
    }
  };

  const handlePharmacySkip = () => {
    // Skip pharmacy selection and go directly to verification
    setCurrentStep('verification');
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
    setPrescriptionOrder(null);
    setSelectedPharmacyId(null);
    setPharmacyError(null);
  };

  const handleBackToPharmacySelection = () => {
    setCurrentStep('pharmacy-selection');
    setPharmacyError(null);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default behavior - go back to patient portal
      navigate('/portal/patient');
    }
  };

  const handleComplete = () => {
    if (!prescriptionOrder) return;

    // Navigate to verification page
    navigate(`/portal/patient/orders/${prescriptionOrder.orderId}/verify`, {
      state: { 
        message: 'Prescription uploaded successfully! Please review the extracted details.',
        fromUpload: true,
        selectedPharmacyId
      }
    });
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload Prescription', completed: currentStep !== 'upload' },
      { key: 'pharmacy-selection', label: 'Select Pharmacy', completed: currentStep === 'verification' },
      { key: 'verification', label: 'Review & Confirm', completed: false }
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : step.key === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.completed ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs mt-2 ${
                  step.key === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const containerClasses = isModal 
    ? "bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto"
    : "bg-white rounded-lg shadow-md p-6";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Prescription Upload</h2>
        {isModal && onCancel && (
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Error Message */}
      {pharmacyError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{pharmacyError}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'upload' && (
        <PrescriptionUpload
          onUploadComplete={handleUploadComplete}
          onCancel={handleCancel}
          isModal={false}
        />
      )}

      {currentStep === 'pharmacy-selection' && prescriptionOrder && (
        <PharmacySelectionStep
          order={prescriptionOrder}
          onPharmacySelect={handlePharmacySelect}
          onBack={handleBackToUpload}
          onSkip={handlePharmacySkip}
        />
      )}

      {currentStep === 'verification' && prescriptionOrder && (
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Order Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Order ID:</span> {prescriptionOrder.orderId}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Medication:</span> {prescriptionOrder.medicationDetails?.name} {prescriptionOrder.medicationDetails?.dosage}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Quantity:</span> {prescriptionOrder.medicationDetails?.quantity} units
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Cost:</span> ${prescriptionOrder.cost?.toFixed(2) || '0.00'}
                </p>
                {selectedPharmacyId && (
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Selected Pharmacy:</span> {selectedPharmacyId}
                  </p>
                )}
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Status:</span> {prescriptionOrder.status}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleBackToPharmacySelection}
              className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Pharmacy Selection
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isUpdatingPharmacy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Updating your order with selected pharmacy...</p>
          </div>
        </div>
      )}
    </div>
  );
};