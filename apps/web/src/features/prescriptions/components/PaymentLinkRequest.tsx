import React, { useState } from 'react';
import { RequestPaymentModal } from './RequestPaymentModal';
import { PaymentLinkRequest as PaymentLinkRequestType, PaymentLinkResponse } from '@pharmarx/shared-types';

interface PaymentLinkRequestProps {
  orderId: string;
  onSuccess?: (response: PaymentLinkResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const PaymentLinkRequest: React.FC<PaymentLinkRequestProps> = ({
  orderId,
  onSuccess,
  onError,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestPayment = async (request: PaymentLinkRequestType) => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call when backend is implemented
      const response = await fetch(`/api/orders/${orderId}/request-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to send payment request: ${response.statusText}`);
      }

      const result: PaymentLinkResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send payment request');
      }

      // Success handling
      const messageType = request.messageType === 'whatsapp' ? 'WhatsApp' : 'SMS';
      const maskedPhone = maskPhoneNumber(request.recipientPhone);
      setSuccessMessage(`Payment link successfully sent via ${messageType} to ${maskedPhone}`);
      
      setIsModalOpen(false);
      
      if (onSuccess) {
        onSuccess(result);
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (onError) {
        onError(errorMessage);
      }
      
      // If no error handler provided, we'll show the error in the modal
      console.error('Payment request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const maskPhoneNumber = (phoneNumber: string): string => {
    // Show first 3 and last 2 digits, mask the middle
    if (phoneNumber.length <= 5) return phoneNumber;
    
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    const masked = '*'.repeat(phoneNumber.length - 5);
    
    return `${start}${masked}${end}`;
  };

  return (
    <div className={className}>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-green-800">Payment Link Sent!</h4>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-400 hover:text-green-600 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Request Payment Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full px-6 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-700 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span className="font-medium">Request Payment from Someone Else</span>
      </button>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center mt-2">
        Send a secure payment link via WhatsApp or SMS to a friend or family member
      </p>

      {/* Modal */}
      <RequestPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRequestPayment}
        orderId={orderId}
        isLoading={isLoading}
      />
    </div>
  );
};