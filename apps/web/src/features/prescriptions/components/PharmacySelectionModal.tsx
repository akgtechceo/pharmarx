import React from 'react';
import { MapPharmacyData, InventoryItem } from '../../../types/pharmacy.types';
import MedicationAvailabilityStatus from './MedicationAvailabilityStatus';

interface PharmacySelectionModalProps {
  pharmacy: MapPharmacyData;
  availability?: InventoryItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

const PharmacySelectionModal: React.FC<PharmacySelectionModalProps> = ({
  pharmacy,
  availability,
  onConfirm,
  onCancel
}) => {
  const getAvailabilityStatus = () => {
    if (!availability || availability.length === 0) {
      return 'unavailable';
    }
    
    const totalQuantity = availability.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity === 0) {
      return 'out-of-stock';
    } else if (totalQuantity <= 10) {
      return 'low-stock';
    } else {
      return 'in-stock';
    }
  };

  const getStatusColor = () => {
    const status = getAvailabilityStatus();
    switch (status) {
      case 'in-stock':
        return 'text-green-600';
      case 'low-stock':
        return 'text-yellow-600';
      case 'out-of-stock':
        return 'text-red-600';
      case 'unavailable':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatAddress = () => {
    const { address } = pharmacy.pharmacy;
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
  };

  const formatHours = () => {
    const { operatingHours } = pharmacy.pharmacy;
    return `${operatingHours.open} - ${operatingHours.close}`;
  };

  const calculateTotalPrice = () => {
    if (!availability || availability.length === 0) return 0;
    return availability.reduce((sum, item) => sum + item.price, 0);
  };

  const formatTotalPrice = () => {
    const total = calculateTotalPrice();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(total);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Pharmacy Selection</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{pharmacy.pharmacy.name}</h3>
              <p className="text-sm text-gray-500">{formatAddress()}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getAvailabilityStatus().replace('-', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {pharmacy.distance.toFixed(1)} km away
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Pharmacy Details */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-gray-900">Open: {formatHours()}</p>
                <p className="text-xs text-gray-500">
                  {pharmacy.pharmacy.operatingHours.daysOpen.join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <p className="text-sm text-gray-900">{pharmacy.pharmacy.contactInfo.phone}</p>
            </div>

            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-700">
                Estimated delivery: {pharmacy.estimatedDeliveryTime} minutes
              </p>
            </div>
          </div>

          {/* Medication Availability */}
          {availability && availability.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Medication Availability</h4>
              <div className="space-y-3">
                {availability.map((item) => (
                  <MedicationAvailabilityStatus
                    key={item.itemId}
                    item={item}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Total Price */}
          {availability && availability.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total Price:</span>
                <span className="text-lg font-semibold text-gray-900">{formatTotalPrice()}</span>
              </div>
            </div>
          )}

          {/* Warning Messages */}
          {getAvailabilityStatus() === 'low-stock' && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-yellow-800">
                  Low stock warning - quantities may be limited
                </span>
              </div>
            </div>
          )}

          {getAvailabilityStatus() === 'unavailable' && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">
                  Medication not available at this pharmacy
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={getAvailabilityStatus() === 'unavailable' || getAvailabilityStatus() === 'out-of-stock'}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                getAvailabilityStatus() === 'unavailable' || getAvailabilityStatus() === 'out-of-stock'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacySelectionModal;