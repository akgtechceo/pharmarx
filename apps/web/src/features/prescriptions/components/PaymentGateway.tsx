import React, { useState } from 'react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentGateway as PaymentGatewayType, ProcessPaymentRequest } from '../types/payment.types';
import { usePaymentProcessing } from '../hooks/usePaymentProcessing';

interface PaymentGatewayProps {
  orderId: string;
  amount: number;
  currency?: string;
  onPaymentSuccess: (paymentId: string, transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel?: () => void;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  orderId,
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  onCancel
}) => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const {
    isProcessing,
    error: processingError,
    processPayment,
    clearError
  } = usePaymentProcessing({
    orderId,
    onSuccess: (paymentId, transactionId) => {
      onPaymentSuccess(paymentId, transactionId);
    },
    onError: (error) => {
      onPaymentError(error);
    }
  });

  const handleGatewaySelect = (gateway: PaymentGatewayType) => {
    setSelectedGateway(gateway);
    clearError();
  };

  const handleProceedToPayment = () => {
    if (!selectedGateway) return;
    setShowPaymentForm(true);
  };

  const handleBackToSelection = () => {
    setShowPaymentForm(false);
    clearError();
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    if (!selectedGateway) return;

    const request: ProcessPaymentRequest = {
      orderId,
      gateway: selectedGateway,
      amount,
      currency,
      ...paymentData
    };

    await processPayment(request);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Payment</h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Payment Summary */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-blue-700">Order ID:</span>
              <span className="ml-2 text-sm font-medium text-blue-900">{orderId}</span>
            </div>
            <div>
              <span className="text-lg font-bold text-blue-900">{formatCurrency(amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {processingError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Payment Error</h3>
              <p className="text-red-700 text-sm mt-1">{processingError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showPaymentForm ? (
        /* Payment Method Selection */
        <div>
          <PaymentMethodSelector
            selectedGateway={selectedGateway}
            onGatewaySelect={handleGatewaySelect}
            isLoading={isProcessing}
          />
          
          {/* Continue Button */}
          {selectedGateway && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={isProcessing}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Continue to Payment
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Payment Form */
        <div>
          {/* Back Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBackToSelection}
              disabled={isProcessing}
              className="flex items-center text-blue-600 hover:text-blue-700 focus:outline-none disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Payment Methods
            </button>
          </div>

          {/* Payment Form Content */}
          <div className="space-y-6">
            {selectedGateway === 'stripe' && (
              <StripePaymentForm
                amount={amount}
                currency={currency}
                onSubmit={handlePaymentSubmit}
                isLoading={isProcessing}
              />
            )}
            
            {selectedGateway === 'paypal' && (
              <PayPalPaymentForm
                amount={amount}
                currency={currency}
                onSubmit={handlePaymentSubmit}
                isLoading={isProcessing}
              />
            )}
            
            {selectedGateway === 'mtn' && (
              <MTNPaymentForm
                amount={amount}
                currency={currency}
                onSubmit={handlePaymentSubmit}
                isLoading={isProcessing}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Payment Form Components
interface PaymentFormProps {
  amount: number;
  currency: string;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}

const StripePaymentForm: React.FC<PaymentFormProps> = ({ amount, currency, onSubmit, isLoading }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In real implementation, this would use Stripe Elements for secure tokenization
    await onSubmit({
      type: 'stripe',
      cardNumber,
      expiryDate,
      cvv,
      cardholderName
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="text-2xl">💳</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Credit/Debit Card Payment</h3>
          <p className="text-sm text-gray-600">Pay securely with your card - {formatCurrency(amount)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cardholder Name *
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number *
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1234 5678 9012 3456"
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date *
            </label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="MM/YY"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVV *
            </label>
            <input
              type="text"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
              </svg>
              <span>Processing Payment...</span>
            </div>
          ) : (
            `Pay ${formatCurrency(amount)}`
          )}
        </button>
      </form>
    </div>
  );
};

const PayPalPaymentForm: React.FC<PaymentFormProps> = ({ amount, currency, onSubmit, isLoading }) => {
  const handlePayPalPayment = async () => {
    // In real implementation, this would integrate with PayPal SDK
    await onSubmit({
      type: 'paypal'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="text-2xl">🅿️</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">PayPal Payment</h3>
          <p className="text-sm text-gray-600">Pay with your PayPal account - {formatCurrency(amount)}</p>
        </div>
      </div>

      <div className="text-center py-8">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🅿️</span>
          </div>
          <p className="text-gray-600">
            You will be redirected to PayPal to complete your payment securely.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePayPalPayment}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
              </svg>
              <span>Redirecting to PayPal...</span>
            </div>
          ) : (
            `Pay with PayPal - ${formatCurrency(amount)}`
          )}
        </button>
      </div>
    </div>
  );
};

const MTNPaymentForm: React.FC<PaymentFormProps> = ({ amount, currency, onSubmit, isLoading }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      type: 'mtn',
      phoneNumber
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="text-2xl">📱</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">MTN Mobile Money</h3>
          <p className="text-sm text-gray-600">Pay with your mobile money account - {formatCurrency(amount)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Money Number *
          </label>
          <div className="relative">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 pl-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="229 XX XX XX XX"
              required
              disabled={isLoading}
            />
            <div className="absolute left-3 top-2.5 text-gray-500">
              +229
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter your MTN Mobile Money number (Benin format)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Payment Instructions</h4>
              <p className="text-xs text-yellow-700 mt-1">
                You will receive an SMS notification to authorize the payment from your mobile money account. 
                Please ensure you have sufficient balance.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !phoneNumber}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
              </svg>
              <span>Processing Payment...</span>
            </div>
          ) : (
            `Pay ${formatCurrency(amount)} via MTN`
          )}
        </button>
      </form>
    </div>
  );
};