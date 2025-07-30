import React from 'react';
import { MapPharmacyData, InventoryItem } from '../../../types/pharmacy.types';
import MedicationAvailabilityStatus from './MedicationAvailabilityStatus';

interface PharmacyInfoWindowProps {
  pharmacy: MapPharmacyData;
  availability?: InventoryItem[];
  onClose: () => void;
  onSelect: (pharmacyId: string) => void;
}

const PharmacyInfoWindow: React.FC<PharmacyInfoWindowProps> = ({
  pharmacy,
  availability,
  onClose,
  onSelect
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

  const handleSelect = () => {
    onSelect(pharmacy.pharmacy.pharmacyId);
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm z-30">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {pharmacy.pharmacy.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getAvailabilityStatus().replace('-', ' ').toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">
                {pharmacy.distance.toFixed(1)} km away
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close info window"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Address */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-900">{formatAddress()}</p>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-900">Open: {formatHours()}</p>
              <p className="text-xs text-gray-500">
                {pharmacy.pharmacy.operatingHours.daysOpen.join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <div>
              <p className="text-sm text-gray-900">{pharmacy.pharmacy.contactInfo.phone}</p>
              {pharmacy.pharmacy.contactInfo.email && (
                <p className="text-sm text-gray-600">{pharmacy.pharmacy.contactInfo.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Availability Details */}
        {availability && availability.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Medication Availability</h4>
            <div className="space-y-2">
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

        {/* Estimated Delivery */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-blue-700">
              Estimated delivery: {pharmacy.estimatedDeliveryTime} minutes
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSelect}
            disabled={getAvailabilityStatus() === 'unavailable' || getAvailabilityStatus() === 'out-of-stock'}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              getAvailabilityStatus() === 'unavailable' || getAvailabilityStatus() === 'out-of-stock'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Select Pharmacy
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PharmacyInfoWindow;