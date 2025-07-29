import React, { useState } from 'react';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import { PrescriptionReviewProps } from '../types/pharmacist.types';
import { ReviewActions } from './ReviewActions';
import { usePrescriptionReview } from '../hooks/usePrescriptionReview';
import { formatReviewDate } from '../utils/dateUtils';

export const PrescriptionReview: React.FC<PrescriptionReviewProps> = ({
  order,
  onClose,
  onActionComplete
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Use the prescription review hook for handling actions
  const {
    isLoading: actionLoading,
    error: actionError,
    approveOrder,
    rejectOrder,
    editOrder,
    clearError
  } = usePrescriptionReview({
    order,
    onApprove: (updatedOrder) => {
      onActionComplete(updatedOrder);
    },
    onReject: (updatedOrder) => {
      onActionComplete(updatedOrder);
    },
    onEdit: (updatedOrder) => {
      onActionComplete(updatedOrder);
    },
    onError: (error, action) => {
      console.error(`Error during ${action}:`, error);
      // Error is handled by the hook's internal state
    }
  });

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Prescription Review - Order #{order.orderId.substring(0, 8)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Patient ID: {order.patientProfileId.substring(0, 8)}... • 
              Submitted: {formatReviewDate(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close review"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Prescription Image */}
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Original Prescription</h3>
              
              <div className="relative bg-white border border-gray-300 rounded-md overflow-hidden">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm text-gray-500">Loading image...</span>
                    </div>
                  </div>
                )}
                
                {imageError ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-gray-500 text-center">
                      Unable to load prescription image
                    </p>
                    <button
                      onClick={() => {
                        setImageError(false);
                        setImageLoading(true);
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <img
                    src={order.originalImageUrl}
                    alt="Original prescription"
                    className="w-full h-auto max-h-96 object-contain"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}
              </div>
            </div>

            {/* OCR Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">OCR Processing Results</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.ocrStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    order.ocrStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    order.ocrStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.ocrStatus || 'pending'}
                  </span>
                </div>
                
                {order.ocrConfidence && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className={`text-sm font-medium ${getConfidenceColor(order.ocrConfidence)}`}>
                      {getConfidenceLabel(order.ocrConfidence)} ({Math.round(order.ocrConfidence * 100)}%)
                    </span>
                  </div>
                )}
                
                {order.extractedText && (
                  <div className="border-t border-gray-200 pt-3">
                    <span className="text-sm text-gray-600 block mb-2">Extracted Text:</span>
                    <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-800 max-h-32 overflow-y-auto">
                      {order.extractedText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Medication Details and Review */}
          <div className="space-y-6">
            {/* Medication Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Medication Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name
                  </label>
                  <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
                    {order.medicationDetails?.name || 'Not extracted'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage
                    </label>
                    <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
                      {order.medicationDetails?.dosage || 'Not extracted'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
                      {order.medicationDetails?.quantity || 'Not extracted'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Verification History */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Patient Verification Status</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Patient Review:</span>
                  <div className="flex items-center">
                    {order.userVerified ? (
                      <>
                        <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-600 font-medium">Verified</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-yellow-600 font-medium">Skipped Verification</span>
                      </>
                    )}
                  </div>
                </div>
                
                {order.userVerificationNotes && (
                  <div>
                    <span className="text-sm text-gray-600 block mb-1">Patient Notes:</span>
                    <div className="bg-white border border-gray-200 rounded p-2 text-sm text-gray-800">
                      {order.userVerificationNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Review Checklist */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Professional Review Checklist</h4>
              
              <div className="space-y-2">
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Prescription is legible and complete</span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Medication name is correctly identified</span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Dosage and quantity are appropriate</span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">No drug interactions or contraindications</span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Patient information matches prescription</span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Insurance coverage verified (if applicable)</span>
                </label>
              </div>
            </div>

            {/* Previous Pharmacist Review (if exists) */}
            {order.pharmacistReview && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Previous Review</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reviewed by:</span>
                    <span className="text-sm text-gray-900 font-medium">
                      {order.pharmacistReview.reviewedBy}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm text-gray-900">
                      {formatReviewDate(order.pharmacistReview.reviewedAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.pharmacistReview.approved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {order.pharmacistReview.approved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                  
                  {order.pharmacistReview.pharmacistNotes && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Notes:</span>
                      <div className="bg-white border border-gray-200 rounded p-2 text-sm text-gray-800">
                        {order.pharmacistReview.pharmacistNotes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Action Error</h3>
                  <div className="mt-2 text-sm text-red-700">{actionError}</div>
                  <div className="mt-4">
                    <button
                      onClick={clearError}
                      className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <ReviewActions
            order={order}
            onApprove={approveOrder}
            onReject={rejectOrder}
            onEdit={editOrder}
            isLoading={actionLoading}
          />
        </div>
      </div>
    </div>
  );
};