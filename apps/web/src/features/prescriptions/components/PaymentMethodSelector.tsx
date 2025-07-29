import React from 'react';
import { PaymentMethodOption, PaymentGateway } from '../types/payment.types';

interface PaymentMethodSelectorProps {
  selectedGateway?: PaymentGateway;
  onGatewaySelect: (gateway: PaymentGateway) => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    gateway: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Pay securely with Visa, Mastercard, or American Express',
    icon: '💳',
    available: true
  },
  {
    gateway: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account or linked bank account',
    icon: '🅿️',
    available: true
  },
  {
    gateway: 'mtn',
    name: 'MTN Mobile Money',
    description: 'Pay using MTN Mobile Money (West Africa)',
    icon: '📱',
    available: true
  }
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedGateway,
  onGatewaySelect,
  isLoading = false
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.gateway}
            type="button"
            onClick={() => onGatewaySelect(method.gateway)}
            disabled={!method.available || isLoading}
            className={`
              relative p-4 border-2 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${selectedGateway === method.gateway
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
              ${!method.available || isLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer'
              }
            `}
          >
            {/* Selection Indicator */}
            {selectedGateway === method.gateway && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Payment Method Content */}
            <div className="flex items-start space-x-3">
              <div className="text-2xl flex-shrink-0 mt-1">
                {method.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  {method.name}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {method.description}
                </p>
                
                {/* Availability Status */}
                <div className="mt-2 flex items-center">
                  {method.available ? (
                    <div className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs font-medium">Available</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-xs font-medium">Unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && selectedGateway === method.gateway && (
              <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
                  </svg>
                  <span className="text-sm text-blue-600 font-medium">Loading...</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M10 1L5 6v10l5 5 5-5V6l-5-5zM8.5 6L10 4.5 11.5 6 10 7.5 8.5 6zm1.5 5.5L8.5 10 10 8.5 11.5 10 10 11.5z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Secure Payment Processing</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              All payments are processed securely through encrypted connections. We never store your payment details. 
              Your financial information is protected by industry-standard security measures.
            </p>
          </div>
        </div>
      </div>

      {/* Gateway-Specific Information */}
      {selectedGateway && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-xl flex-shrink-0">
              {PAYMENT_METHODS.find(m => m.gateway === selectedGateway)?.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                {PAYMENT_METHODS.find(m => m.gateway === selectedGateway)?.name} Selected
              </h4>
              <div className="text-xs text-blue-800 space-y-1">
                {selectedGateway === 'stripe' && (
                  <>
                    <p>• Supports Visa, Mastercard, American Express, and Discover</p>
                    <p>• Secure card tokenization - no card details stored</p>
                    <p>• Instant payment confirmation</p>
                  </>
                )}
                {selectedGateway === 'paypal' && (
                  <>
                    <p>• Pay with PayPal balance or linked bank account</p>
                    <p>• Buyer protection included</p>
                    <p>• No need to share card details</p>
                  </>
                )}
                {selectedGateway === 'mtn' && (
                  <>
                    <p>• Available in Benin, Ghana, Nigeria, and other West African countries</p>
                    <p>• Pay directly from your mobile money account</p>
                    <p>• SMS confirmation for transactions</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};