import React, { useState } from 'react';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import PharmacyMapView from './PharmacyMapView';

interface PharmacySelectionStepProps {
  order: PrescriptionOrder;
  onPharmacySelect: (pharmacyId: string) => void;
  onBack: () => void;
  onSkip?: () => void;
}

const PharmacySelectionStep: React.FC<PharmacySelectionStepProps> = ({
  order,
  onPharmacySelect,
  onBack,
  onSkip
}) => {
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePharmacySelect = async (pharmacyId: string) => {
    setSelectedPharmacyId(pharmacyId);
    setIsLoading(true);
    
    try {
      // Here you would typically update the order with the selected pharmacy
      // For now, we'll just call the callback
      await onPharmacySelect(pharmacyId);
    } catch (error) {
      console.error('Failed to select pharmacy:', error);
      setSelectedPharmacyId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Select Pharmacy</h2>
            <p className="text-gray-600 mt-1">
              Choose a pharmacy for your prescription: {order.medicationDetails?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {onSkip && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Order #{order.orderId}</h3>
              <p className="text-sm text-blue-700">
                {order.medicationDetails?.name} {order.medicationDetails?.dosage} - {order.medicationDetails?.quantity} units
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-900">
                ${order.cost?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="mb-6">
        <PharmacyMapView
          medicationName={order.medicationDetails?.name || ''}
          onPharmacySelect={handlePharmacySelect}
          className="w-full"
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How to select a pharmacy:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Green markers: Medication in stock</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Yellow markers: Low stock available</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Red markers: Out of stock</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Gray markers: Availability unknown</span>
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-3">
          Click on a marker to view pharmacy details and select your preferred location.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Updating your order...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacySelectionStep;