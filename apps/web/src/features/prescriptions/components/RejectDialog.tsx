import React, { useState, useEffect } from 'react';
import { RejectDialogProps } from '../types/pharmacist.types';

const COMMON_REJECTION_REASONS = [
  'Illegible prescription',
  'Incomplete medication information', 
  'Unclear dosage instructions',
  'Patient information mismatch',
  'Drug interaction concerns',
  'Invalid prescription format',
  'Expired prescription',
  'Insurance coverage issues',
  'Other (specify in notes)'
];

export const RejectDialog: React.FC<RejectDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; notes?: string }>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setRejectionReason('');
      setPharmacistNotes('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: { reason?: string; notes?: string } = {};

    if (!rejectionReason.trim()) {
      newErrors.reason = 'Please select a rejection reason';
    }

    if (rejectionReason === 'Other (specify in notes)' && !pharmacistNotes.trim()) {
      newErrors.notes = 'Please provide details in notes when selecting "Other"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onConfirm(rejectionReason, pharmacistNotes.trim() || undefined);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Reject Prescription
            </h3>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              aria-label="Close dialog"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Rejection Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (errors.reason) {
                    setErrors({ ...errors, reason: undefined });
                  }
                }}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.reason 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                disabled={isLoading}
              >
                <option value="">Select a reason...</option>
                {COMMON_REJECTION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.reason}
                </p>
              )}
            </div>

            {/* Pharmacist Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
                {rejectionReason === 'Other (specify in notes)' && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <textarea
                value={pharmacistNotes}
                onChange={(e) => {
                  setPharmacistNotes(e.target.value);
                  if (errors.notes) {
                    setErrors({ ...errors, notes: undefined });
                  }
                }}
                rows={4}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.notes 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Provide additional details about the rejection..."
                disabled={isLoading}
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.notes}
                </p>
              )}
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Rejection Notice
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This action will reject the prescription and notify the patient. 
                    Please ensure the reason is clear and actionable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Rejecting...
                </>
              ) : (
                'Reject Prescription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};