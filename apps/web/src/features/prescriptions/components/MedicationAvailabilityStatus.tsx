import React from 'react';
import { InventoryItem } from '../../../types/pharmacy.types';

interface MedicationAvailabilityStatusProps {
  item: InventoryItem;
  compact?: boolean;
}

const MedicationAvailabilityStatus: React.FC<MedicationAvailabilityStatusProps> = ({
  item,
  compact = false
}) => {
  const getAvailabilityStatus = () => {
    if (item.quantity === 0) {
      return 'out-of-stock';
    } else if (item.quantity <= 10) {
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
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    const status = getAvailabilityStatus();
    switch (status) {
      case 'in-stock':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'low-stock':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'out-of-stock':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const formatPrice = () => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item.currency || 'USD'
    }).format(item.price);
  };

  const formatQuantity = () => {
    return `${item.quantity} ${item.unit}`;
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const updated = new Date(item.lastUpdated);
    const diffInMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just updated';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {item.medicationName} {item.strength}
            </p>
            <p className="text-xs text-gray-500">
              {item.dosage} • {item.form}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {getAvailabilityStatus().replace('-', ' ')}
          </p>
          <p className="text-xs text-gray-500">
            {formatQuantity()} • {formatPrice()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {item.medicationName}
            </h4>
            {item.genericName && item.genericName !== item.medicationName && (
              <p className="text-xs text-gray-500">Generic: {item.genericName}</p>
            )}
          </div>
        </div>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getAvailabilityStatus().replace('-', ' ').toUpperCase()}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Strength</p>
          <p className="text-sm text-gray-900">{item.strength}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Form</p>
          <p className="text-sm text-gray-900 capitalize">{item.form}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Dosage</p>
          <p className="text-sm text-gray-900">{item.dosage}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="text-sm text-gray-900">{formatQuantity()}</p>
        </div>
      </div>

      {/* Price and Update Info */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-lg font-semibold text-gray-900">{formatPrice()}</p>
          <p className="text-xs text-gray-500">Last updated: {formatLastUpdated()}</p>
        </div>
        
        {item.expiryDate && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Expires</p>
            <p className="text-sm text-gray-900">
              {new Date(item.expiryDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Warning for low stock */}
      {getAvailabilityStatus() === 'low-stock' && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-yellow-800">
              Low stock - only {item.quantity} {item.unit} remaining
            </span>
          </div>
        </div>
      )}

      {/* Warning for out of stock */}
      {getAvailabilityStatus() === 'out-of-stock' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-red-800">
              Currently out of stock
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationAvailabilityStatus;