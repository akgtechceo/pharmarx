import React from 'react';
import { PrescriptionOrder, PrescriptionOrderStatus } from '@pharmarx/shared-types';
import { useDeliveryTrackingEligibility } from '../hooks/useDeliveryTracking';

interface OrderStatusDisplayProps {
  order: PrescriptionOrder;
  showFullProgress?: boolean;
  className?: string;
  onTrackDelivery?: (orderId: string) => void;
}

interface StatusInfo {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: JSX.Element;
  progressStep: number;
}

const getStatusInfo = (status: PrescriptionOrderStatus): StatusInfo => {
  const statusMap: Record<PrescriptionOrderStatus, StatusInfo> = {
    'pending_verification': {
      label: 'Pending Verification',
      description: 'Prescription uploaded and awaiting verification',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      progressStep: 1,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    },
    'awaiting_verification': {
      label: 'Awaiting Verification',
      description: 'Prescription is being reviewed by patient',
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      progressStep: 1,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    },
    'awaiting_payment': {
      label: 'Awaiting Payment',
      description: 'Prescription approved - payment required to proceed',
      color: 'text-purple-800',
      bgColor: 'bg-purple-100',
      progressStep: 2,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      )
    },
    'preparing': {
      label: 'Preparing',
      description: 'Your medication is being prepared by the pharmacy',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      progressStep: 3,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      )
    },
    'out_for_delivery': {
      label: 'Ready for Delivery',
      description: 'Your medication is ready for pickup or delivery',
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      progressStep: 4,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707L16 7.586A1 1 0 0015.414 7H14z" />
        </svg>
      )
    },
    'delivered': {
      label: 'Delivered',
      description: 'Your medication has been successfully delivered',
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      progressStep: 5,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    },
    'rejected': {
      label: 'Rejected',
      description: 'Prescription was rejected during review',
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      progressStep: 0,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )
    }
  };

  return statusMap[status];
};

const getProgressSteps = () => [
  { step: 1, label: 'Verification', description: 'Prescription review and verification' },
  { step: 2, label: 'Payment', description: 'Payment processing' },
  { step: 3, label: 'Preparing', description: 'Medication preparation' },
  { step: 4, label: 'Ready', description: 'Ready for delivery' },
  { step: 5, label: 'Delivered', description: 'Completed' }
];

export const OrderStatusDisplay: React.FC<OrderStatusDisplayProps> = ({
  order,
  showFullProgress = false,
  className = '',
  onTrackDelivery
}) => {
  const statusInfo = getStatusInfo(order.status);
  const progressSteps = getProgressSteps();
  const { shouldShowTracking } = useDeliveryTrackingEligibility(order.status);
  
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTrackDelivery = () => {
    onTrackDelivery?.(order.orderId);
  };

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Current Status Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`inline-flex p-2 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{statusInfo.label}</h3>
            <p className="text-sm text-gray-600">{statusInfo.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
              {statusInfo.label}
            </div>
            {/* Track Delivery Button */}
            {shouldShowTracking && (
              <button
                onClick={handleTrackDelivery}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Track Delivery
              </button>
            )}
          </div>
        </div>
        
        {/* Order Details */}
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-500">
          <div>
            <span className="font-medium">Order ID:</span> {order.orderId.substring(0, 12)}...
          </div>
          <div>
            <span className="font-medium">Created:</span> {formatDate(order.createdAt)}
          </div>
          {order.updatedAt && (
            <>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDate(order.updatedAt)}
              </div>
              <div>
                <span className="font-medium">Cost:</span> {order.cost ? `$${order.cost.toFixed(2)}` : 'TBD'}
              </div>
            </>
          )}
        </div>

        {/* Delivery Tracking Status Banner */}
        {shouldShowTracking && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Your medication is out for delivery
                </p>
                <p className="text-xs text-blue-700">
                  Click "Track Delivery" above to see real-time location and estimated arrival time
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleTrackDelivery}
                  className="text-blue-700 hover:text-blue-900 font-medium text-sm"
                >
                  View Map →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {showFullProgress && order.status !== 'rejected' && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Order Progress</h4>
          <div className="flex items-center space-x-4">
            {progressSteps.map((step, index) => {
              const isCompleted = statusInfo.progressStep > step.step;
              const isCurrent = statusInfo.progressStep === step.step;
              const isUpcoming = statusInfo.progressStep < step.step;

              return (
                <React.Fragment key={step.step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-200 border-gray-300 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{step.step}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${
                        isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-500 max-w-16">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {index < progressSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${
                      statusInfo.progressStep > step.step ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Medication Details */}
      {order.medicationDetails && (
        <div className="p-4 bg-gray-50 rounded-b-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Medication</h4>
          <div className="text-sm text-gray-600">
            <div><strong>{order.medicationDetails.name}</strong></div>
            <div>{order.medicationDetails.dosage} • Qty: {order.medicationDetails.quantity}</div>
          </div>
        </div>
      )}
    </div>
  );
};