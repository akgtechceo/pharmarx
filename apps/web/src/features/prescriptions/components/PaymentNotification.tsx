import React from 'react';
import { PaymentNotification as PaymentNotificationData } from '@pharmarx/shared-types';

interface PaymentNotificationProps {
  notification: PaymentNotificationData;
  onProceedToPayment: () => void;
  isLoading?: boolean;
}

export const PaymentNotification: React.FC<PaymentNotificationProps> = ({
  notification,
  onProceedToPayment,
  isLoading = false
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // This should be configurable based on region
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header with Status Indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Approved - Payment Required</h2>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-700 uppercase tracking-wide">
            Approved
          </span>
        </div>
      </div>

      {/* Status Transition Indicator */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-800">Verified by Pharmacist</span>
              </div>
              <div className="text-xs text-green-600">
                {formatDate(notification.approvedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-blue-800">Awaiting Payment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Medication & Cost Details */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Prescription Details</h3>
            
            {notification.medicationDetails && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Medication:</span>
                  <span className="text-sm font-semibold text-gray-900">{notification.medicationDetails.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Dosage:</span>
                  <span className="text-sm text-gray-900">{notification.medicationDetails.dosage}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Quantity:</span>
                  <span className="text-sm text-gray-900">{notification.medicationDetails.quantity}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cost Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment Information</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-medium text-blue-800">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-900">
                  {notification.calculatedCost ? formatCurrency(notification.calculatedCost) : 'TBD'}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Cost calculated and verified by licensed pharmacist
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Pharmacy & Delivery Info */}
        <div className="space-y-6">
          {/* Pharmacy Information */}
          {notification.pharmacyInfo && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Pharmacy Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <p className="text-sm text-gray-900 mt-1">{notification.pharmacyInfo.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Address:</span>
                  <p className="text-sm text-gray-900 mt-1">{notification.pharmacyInfo.address}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Phone:</span>
                  <p className="text-sm text-gray-900 mt-1">{notification.pharmacyInfo.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Information */}
          {notification.estimatedDelivery && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Estimated Delivery</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <span className="text-lg font-medium text-yellow-800">
                    {notification.estimatedDelivery.timeframe}
                  </span>
                </div>
                <p className="text-sm text-yellow-700">
                  {notification.estimatedDelivery.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onProceedToPayment}
          disabled={isLoading || !notification.calculatedCost}
          className={`px-8 py-3 rounded-lg font-medium text-white transition-colors duration-200 ${
            isLoading || !notification.calculatedCost
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
              </svg>
              <span>Processing...</span>
            </div>
          ) : (
            `Proceed to Payment - ${notification.calculatedCost ? formatCurrency(notification.calculatedCost) : 'TBD'}`
          )}
        </button>
      </div>
    </div>
  );
};