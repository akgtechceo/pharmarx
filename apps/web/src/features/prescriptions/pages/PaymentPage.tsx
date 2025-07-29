import React, { useState } from 'react';
import { PaymentNotification } from '../components/PaymentNotification';
import { PaymentGateway } from '../components/PaymentGateway';
import { usePaymentNotification } from '../hooks/usePaymentNotification';

interface PaymentPageProps {
  orderId: string;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ orderId }) => {
  const [currentStep, setCurrentStep] = useState<'notification' | 'payment' | 'success'>('notification');
  const [paymentResult, setPaymentResult] = useState<{ paymentId: string; transactionId: string } | null>(null);

  const {
    isLoading,
    error,
    notification,
    refetchNotification
  } = usePaymentNotification({
    orderId,
    onStatusChange: (status) => {
      console.log(`Order ${orderId} status changed to: ${status}`);
    }
  });

  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (paymentId: string, transactionId: string) => {
    setPaymentResult({ paymentId, transactionId });
    setCurrentStep('success');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Stay on payment step to allow retry
  };

  const handleBackToNotification = () => {
    setCurrentStep('notification');
  };

  const handleStartNewPayment = () => {
    setCurrentStep('notification');
    setPaymentResult(null);
    refetchNotification();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
            <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
          </svg>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Payment</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refetchNotification}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Payment Not Available</h3>
          <p className="text-yellow-700 mb-4">
            This order is not ready for payment yet. Please wait for pharmacist approval.
          </p>
          <button
            onClick={refetchNotification}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep === 'notification' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'notification' ? 'bg-blue-100 border-2 border-blue-600' : 'bg-green-500'
              }`}>
                {currentStep === 'notification' ? (
                  <span className="text-sm font-bold">1</span>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Review Order</span>
            </div>
            
            <div className="flex-1 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'payment' ? 'text-blue-600' : currentStep === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'payment' ? 'bg-blue-100 border-2 border-blue-600' :
                currentStep === 'success' ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                {currentStep === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>
            
            <div className="flex-1 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'success' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'success' ? 'bg-blue-100 border-2 border-blue-600' : 'bg-gray-200'
              }`}>
                <span className="text-sm font-bold">3</span>
              </div>
              <span className="ml-2 text-sm font-medium">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentStep === 'notification' && (
          <PaymentNotification
            notification={notification}
            onProceedToPayment={handleProceedToPayment}
            isLoading={false}
          />
        )}

        {currentStep === 'payment' && notification && (
          <PaymentGateway
            orderId={orderId}
            amount={notification.calculatedCost || 0}
            currency="USD"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onCancel={handleBackToNotification}
          />
        )}

        {currentStep === 'success' && paymentResult && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600">Your order has been paid and is now being prepared.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Payment ID:</span>
                  <span className="text-sm font-medium text-green-900">{paymentResult.paymentId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Transaction ID:</span>
                  <span className="text-sm font-medium text-green-900">{paymentResult.transactionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Order ID:</span>
                  <span className="text-sm font-medium text-green-900">{orderId}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You will receive a receipt via email shortly. Your order status has been updated to "Paid" 
                and the pharmacy will begin preparing your medication.
              </p>
              
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleStartNewPayment}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Make Another Payment
                </button>
                <button
                  onClick={() => window.location.href = '/orders'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  View My Orders
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};