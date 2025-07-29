import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import PrescriptionVerification from '../components/PrescriptionVerification';
import { VerificationActionType } from '../types/verification.types';

// Mock service to fetch order by ID - in real implementation, this would call actual API
const fetchPrescriptionOrder = async (orderId: string): Promise<PrescriptionOrder> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock order data with OCR results
  return {
    orderId,
    patientProfileId: 'patient-123',
    status: 'pending_verification',
    originalImageUrl: 'https://via.placeholder.com/400x600?text=Prescription+Image',
    extractedText: 'Prescription for: Metformin 500mg, Take twice daily with meals, Quantity: 30 tablets',
    ocrStatus: 'completed',
    ocrProcessedAt: new Date(),
    medicationDetails: {
      name: 'Metformin',
      dosage: '500mg',
      quantity: 30
    },
    cost: 25.99,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export const VerificationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['prescription-order', orderId],
    queryFn: () => fetchPrescriptionOrder(orderId!),
    enabled: !!orderId,
    retry: 2
  });

  const handleVerificationComplete = (
    updatedOrder: PrescriptionOrder, 
    actionType: VerificationActionType
  ) => {
    // Show success message based on action type
    const message = actionType === 'confirm' 
      ? 'Prescription details confirmed successfully!'
      : 'Prescription sent to pharmacist for review!';
    
    console.log(message, updatedOrder);
    
    // Navigate to payment or status page
    navigate(`/portal/patient/orders/${updatedOrder.orderId}/payment`, {
      state: { 
        message,
        actionType,
        order: updatedOrder
      }
    });
  };

  const handleVerificationError = (error: string, actionType: VerificationActionType) => {
    console.error(`Verification ${actionType} failed:`, error);
    // Could show a toast notification or error modal here
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Order</h1>
          <p className="text-gray-600 mb-6">No order ID provided in the URL.</p>
          <button
            onClick={() => navigate('/portal/patient')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prescription details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Prescription</h1>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'Unable to load prescription details.'}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/portal/patient')}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Return to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if order is in the correct status for verification
  if (order.status !== 'pending_verification') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Not Available</h1>
          <p className="text-gray-600 mb-6">
            This prescription is currently in "{order.status}" status and cannot be verified.
          </p>
          <button
            onClick={() => navigate('/portal/patient')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <button
                onClick={() => navigate('/portal/patient')}
                className="hover:text-blue-600"
              >
                Patient Portal
              </button>
            </li>
            <li>/</li>
            <li>
              <button
                onClick={() => navigate('/portal/patient/prescriptions')}
                className="hover:text-blue-600"
              >
                Prescriptions
              </button>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">Verify Prescription</li>
          </ol>
        </nav>

        {/* Main Verification Component */}
        <PrescriptionVerification
          order={order}
          onComplete={handleVerificationComplete}
          onError={handleVerificationError}
        />
      </div>
    </div>
  );
};

export default VerificationPage;