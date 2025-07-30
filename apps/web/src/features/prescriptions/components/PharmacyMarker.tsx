import React from 'react';
import { MapPharmacyData, InventoryItem } from '../../../types/pharmacy.types';

interface PharmacyMarkerProps {
  pharmacy: MapPharmacyData;
  availability?: InventoryItem[];
  isSelected: boolean;
  onSelect: (pharmacyId: string) => void;
  onInfoWindowOpen: (pharmacyId: string) => void;
}

const PharmacyMarker: React.FC<PharmacyMarkerProps> = ({
  pharmacy,
  availability,
  isSelected,
  onSelect,
  onInfoWindowOpen
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

  const getMarkerColor = () => {
    const status = getAvailabilityStatus();
    switch (status) {
      case 'in-stock':
        return 'bg-green-500';
      case 'low-stock':
        return 'bg-yellow-500';
      case 'out-of-stock':
        return 'bg-red-500';
      case 'unavailable':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getMarkerIcon = () => {
    const status = getAvailabilityStatus();
    switch (status) {
      case 'in-stock':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'low-stock':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'out-of-stock':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'unavailable':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleClick = () => {
    onSelect(pharmacy.pharmacy.pharmacyId);
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoWindowOpen(pharmacy.pharmacy.pharmacyId);
  };

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-all duration-200 ${
        isSelected ? 'scale-110 z-20' : 'z-10'
      }`}
      style={{
        left: `${pharmacy.pharmacy.coordinates.longitude}%`,
        top: `${pharmacy.pharmacy.coordinates.latitude}%`
      }}
    >
      {/* Main Marker */}
      <div
        className={`${getMarkerColor()} rounded-full p-2 shadow-lg border-2 border-white hover:scale-110 transition-transform duration-200 ${
          isSelected ? 'ring-4 ring-blue-300' : ''
        }`}
        onClick={handleClick}
        title={`${pharmacy.pharmacy.name} - ${getAvailabilityStatus().replace('-', ' ')}`}
      >
        {getMarkerIcon()}
      </div>

      {/* Info Button */}
      <button
        className="absolute -top-8 -right-8 bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors duration-200"
        onClick={handleInfoClick}
        title="View pharmacy details"
      >
        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Distance Label */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow-sm whitespace-nowrap">
        {pharmacy.distance.toFixed(1)} km
      </div>
    </div>
  );
};

export default PharmacyMarker;