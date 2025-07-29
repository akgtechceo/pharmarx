import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentGateway } from '../components/PaymentGateway';
import { PublicPaymentInfo, PublicPaymentRequest, PublicPaymentResponse } from '@pharmarx/shared-types';

interface PublicPaymentPageState {
  paymentInfo: PublicPaymentInfo | null;
  isLoading: boolean;
  error: string | null;
  currentStep: 'loading' | 'info' | 'payment' | 'success' | 'error';
  paymentResult: { paymentId: string; transactionId: string } | null;
}

export const PublicPaymentPage: React.FC = () => {
  const { paymentToken } = useParams<{ paymentToken: string }>();
  const navigate = useNavigate();
  
  const [state, setState] = useState<PublicPaymentPageState>({
    paymentInfo: null,
    isLoading: true,
    error: null,
    currentStep: 'loading',
    paymentResult: null
  });

  useEffect(() => {
    if (paymentToken) {
      fetchPaymentInfo(paymentToken);
    }
  }, [paymentToken]);

  const fetchPaymentInfo = async (token: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/public/pay/${token}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load payment information',
          currentStep: 'error'
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        paymentInfo: result.data,
        isLoading: false,
        currentStep: 'info'
      }));
    } catch (error) {
      console.error('Error fetching payment info:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error. Please check your connection and try again.',
        currentStep: 'error'
      }));
    }
  };

  const handleProceedToPayment = () => {
    setState(prev => ({ ...prev, currentStep: 'payment' }));
  };

  const handleBackToInfo = () => {
    setState(prev => ({ ...prev, currentStep: 'info' }));
  };

  const handlePaymentSuccess = (paymentId: string, transactionId: string) => {
    setState(prev => ({
      ...prev,
      paymentResult: { paymentId, transactionId },
      currentStep: 'success'
    }));
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setState(prev => ({ ...prev, error }));
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Loading state
  if (state.currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment Information</h2>
              <p className="text-gray-600">Please wait while we verify your payment link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.currentStep === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">Payment Link Invalid</h2>
              <p className="text-red-700 mb-6">{state.error}</p>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">This could happen if:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>The payment link has expired (links are valid for 48 hours)</li>
                  <li>The payment has already been completed</li>
                  <li>The link is invalid or corrupted</li>
                </ul>
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-600">
                  Please contact the person who sent you this link for a new payment request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment information display
  if (state.currentStep === 'info' && state.paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Request</h1>
              <p className="text-gray-600">Someone has requested your help to pay for their medication</p>
            </div>

            {/* Medication Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Medication Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">Medication:</span>
                  <span className="text-blue-900 font-semibold">{state.paymentInfo.medicationName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-medium">Pharmacy:</span>
                  <span className="text-blue-900">{state.paymentInfo.pharmacyName}</span>
                </div>
                <div className="border-t border-blue-200 pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-blue-700">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {formatCurrency(state.paymentInfo.cost, state.paymentInfo.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-green-800">Secure Payment</h4>
                  <p className="text-sm text-green-700 mt-1">
                    This is a secure payment link. Your payment information is protected and encrypted. 
                    No personal information about the patient is shared with you.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Proceed to Payment - {formatCurrency(state.paymentInfo.cost, state.paymentInfo.currency)}
              </button>
              <p className="text-xs text-gray-500 mt-3">
                You will be able to choose your preferred payment method on the next page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment processing
  if (state.currentStep === 'payment' && state.paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBackToInfo}
              className="flex items-center text-blue-600 hover:text-blue-700 focus:outline-none"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Payment Details
            </button>
          </div>

          {/* Payment Gateway Component */}
          <PaymentGateway
            orderId={state.paymentInfo.orderId}
            amount={state.paymentInfo.cost}
            currency={state.paymentInfo.currency}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onCancel={handleBackToInfo}
          />
        </div>
      </div>
    );
  }

  // Success state
  if (state.currentStep === 'success' && state.paymentResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">
                Thank you for helping with this medication payment. The prescription is now being prepared.
              </p>

              {/* Payment Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-green-800 mb-3">Payment Confirmation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment ID:</span>
                    <span className="text-green-900 font-mono">{state.paymentResult.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Transaction ID:</span>
                    <span className="text-green-900 font-mono">{state.paymentResult.transactionId}</span>
                  </div>
                  {state.paymentInfo && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Amount Paid:</span>
                      <span className="text-green-900 font-semibold">
                        {formatCurrency(state.paymentInfo.cost, state.paymentInfo.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">What happens next?</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• The person who requested this payment has been notified</p>
                  <p>• The pharmacy will begin preparing the medication</p>
                  <p>• A receipt has been generated for this transaction</p>
                </div>
              </div>

              {/* Thank You Message */}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Your generosity makes a difference. Thank you for helping someone access their medication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};