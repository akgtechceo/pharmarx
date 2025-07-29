import React, { useState } from 'react';
import { PaymentLinkRequest } from '@pharmarx/shared-types';

interface RequestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: PaymentLinkRequest) => Promise<void>;
  orderId: string;
  isLoading?: boolean;
}

export const RequestPaymentModal: React.FC<RequestPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  orderId,
  isLoading = false
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageType, setMessageType] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [countryCode, setCountryCode] = useState('+229'); // Default to Benin
  const [errors, setErrors] = useState<string[]>([]);

  // Common country codes for West Africa
  const countryCodes = [
    { code: '+229', country: 'Benin', flag: '🇧🇯' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
    { code: '+227', country: 'Niger', flag: '🇳🇪' },
    { code: '+228', country: 'Togo', flag: '🇹🇬' }
  ];

  const validatePhoneNumber = (phone: string, code: string): boolean => {
    // Remove all non-digits for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Basic validation: should have 8-10 digits after country code
    if (cleanPhone.length < 8 || cleanPhone.length > 10) {
      return false;
    }

    // Country-specific validation
    switch (code) {
      case '+229': // Benin
        return cleanPhone.length === 8 && /^[0-9]{8}$/.test(cleanPhone);
      case '+233': // Ghana
        return cleanPhone.length === 9 && /^[0-9]{9}$/.test(cleanPhone);
      case '+234': // Nigeria
        return cleanPhone.length === 10 && /^[0-9]{10}$/.test(cleanPhone);
      default:
        return cleanPhone.length >= 8 && cleanPhone.length <= 10;
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format based on country code
    if (countryCode === '+229' && cleaned.length <= 8) {
      // Benin: XX XX XX XX
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4').trim();
    } else if (countryCode === '+233' && cleaned.length <= 9) {
      // Ghana: XXX XXX XXX
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
    } else if (countryCode === '+234' && cleaned.length <= 10) {
      // Nigeria: XXX XXX XXXX
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3').trim();
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: string[] = [];
    
    if (!phoneNumber.trim()) {
      validationErrors.push('Phone number is required');
    } else if (!validatePhoneNumber(phoneNumber, countryCode)) {
      validationErrors.push('Please enter a valid phone number for the selected country');
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    try {
      await onSubmit({
        orderId,
        recipientPhone: fullPhoneNumber,
        messageType
      });
      
      // Reset form on success
      setPhoneNumber('');
      setMessageType('whatsapp');
      setCountryCode('+229');
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to send payment request. Please try again.']);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPhoneNumber('');
      setMessageType('whatsapp');
      setCountryCode('+229');
      setErrors([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Request Payment from Someone Else</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-800">How it works</h4>
                <p className="text-xs text-blue-700 mt-1">
                  We'll send a secure payment link to the person you specify. They can use this link to pay for your medication safely without seeing your personal information.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-red-800">Please fix the following errors:</h4>
                  <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Message Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you like to send the payment link?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMessageType('whatsapp')}
                disabled={isLoading}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  messageType === 'whatsapp'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📱</div>
                  <div>
                    <div className="font-medium text-gray-900">WhatsApp</div>
                    <div className="text-xs text-gray-600">Instant delivery</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setMessageType('sms')}
                disabled={isLoading}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  messageType === 'sms'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💬</div>
                  <div>
                    <div className="font-medium text-gray-900">SMS</div>
                    <div className="text-xs text-gray-600">Text message</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient's Phone Number *
            </label>
            
            {/* Country Code Selector */}
            <div className="mb-3">
              <select
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setPhoneNumber(''); // Clear phone number when country changes
                  setErrors([]);
                }}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.country} ({country.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Number Input */}
            <div className="relative">
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 pl-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder={countryCode === '+229' ? '12 34 56 78' : 'Enter phone number'}
                required
                disabled={isLoading}
              />
              <div className="absolute left-3 top-2.5 text-gray-500 font-medium">
                {countryCode}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              Enter the phone number of the person who will pay for your medication
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !phoneNumber.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                    <path fill="currentColor" d="m15.84 12.84.84-.84-.84-.84-.84.84z" className="opacity-75"></path>
                  </svg>
                  <span>Sending...</span>
                </div>
              ) : (
                `Send via ${messageType === 'whatsapp' ? 'WhatsApp' : 'SMS'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};