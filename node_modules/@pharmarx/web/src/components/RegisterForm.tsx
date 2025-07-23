import React, { useState } from 'react';
import { UserRole } from '@pharmarx/shared-types';

export interface RegisterFormData {
  role: UserRole;
  contactType: 'email' | 'phone';
  email?: string;
  phoneNumber?: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormProps {
  onSubmit: (formData: RegisterFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const ROLE_OPTIONS = [
  { value: UserRole.Patient, label: 'Patient/Caregiver', description: 'Manage prescriptions and health records' },
  { value: UserRole.Doctor, label: 'Doctor', description: 'Prescribe medications and manage patients' },
  { value: UserRole.Pharmacist, label: 'Pharmacist', description: 'Dispense medications and provide consultations' }
];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    role: UserRole.Patient,
    contactType: 'email',
    displayName: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RegisterFormData, string>> = {};

    // Display name validation
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    // Contact validation
    if (formData.contactType === 'email') {
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
      }
    } else {
      if (!formData.phoneNumber?.trim()) {
        errors.phoneNumber = 'Phone number is required';
      } else {
        const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(formData.phoneNumber)) {
          errors.phoneNumber = 'Please enter a valid phone number';
        }
      }
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Registration error:', error);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleContactTypeChange = (contactType: 'email' | 'phone') => {
    setFormData(prev => ({
      ...prev,
      contactType,
      email: contactType === 'email' ? prev.email : undefined,
      phoneNumber: contactType === 'phone' ? prev.phoneNumber : undefined
    }));
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I am a:
          </label>
          <div className="space-y-2">
            {ROLE_OPTIONS.map(option => (
              <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={formData.role === option.value}
                  onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Contact Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Method:
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="contactType"
                value="email"
                checked={formData.contactType === 'email'}
                onChange={() => handleContactTypeChange('email')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">Email</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="contactType"
                value="phone"
                checked={formData.contactType === 'phone'}
                onChange={() => handleContactTypeChange('phone')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">Phone Number</span>
            </label>
          </div>
        </div>

        {/* Contact Input */}
        <div>
          {formData.contactType === 'email' ? (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
                disabled={isLoading}
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number"
                disabled={isLoading}
              />
              {formErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>
              )}
            </div>
          )}
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formErrors.displayName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your display name"
            disabled={isLoading}
          />
          {formErrors.displayName && (
            <p className="mt-1 text-xs text-red-600">{formErrors.displayName}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formErrors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter password (min 6 characters)"
            disabled={isLoading}
          />
          {formErrors.password && (
            <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
            disabled={isLoading}
          />
          {formErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm; 