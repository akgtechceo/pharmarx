import React, { useState, useEffect } from 'react';
import { PrescriptionOrder, MedicationDetails, PrescriptionOrderStatus } from '@pharmarx/shared-types';
import { RejectDialog } from './RejectDialog';
import { ReviewActionsProps, ApproveOrderRequest, RejectOrderRequest, EditOrderRequest } from '../types/pharmacist.types';

type ActionMode = 'review' | 'edit' | 'approve';

interface StatusUpdateConfirmDialog {
  isOpen: boolean;
  status: PrescriptionOrderStatus | null;
  title: string;
  message: string;
}

export const ReviewActions: React.FC<ReviewActionsProps> = ({
  order,
  onApprove,
  onReject,
  onEdit,
  onStatusUpdate,
  onStatusUpdateComplete,
  isLoading
}) => {
  const [actionMode, setActionMode] = useState<ActionMode>('review');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<StatusUpdateConfirmDialog>({
    isOpen: false,
    status: null,
    title: '',
    message: ''
  });
  
  // Form states
  const [editedDetails, setEditedDetails] = useState<MedicationDetails>({
    name: order.medicationDetails?.name || '',
    dosage: order.medicationDetails?.dosage || '',
    quantity: order.medicationDetails?.quantity || 0
  });
  const [calculatedCost, setCalculatedCost] = useState(order.cost || 0);
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when order changes
  useEffect(() => {
    setEditedDetails({
      name: order.medicationDetails?.name || '',
      dosage: order.medicationDetails?.dosage || '',
      quantity: order.medicationDetails?.quantity || 0
    });
    setCalculatedCost(order.cost || 0);
    setPharmacistNotes('');
    setErrors({});
    setActionMode('review');
  }, [order]);

  const validateMedicationDetails = () => {
    const newErrors: { [key: string]: string } = {};

    if (!editedDetails.name.trim()) {
      newErrors.name = 'Medication name is required';
    }

    if (!editedDetails.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }

    if (!editedDetails.quantity || editedDetails.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateApproval = () => {
    const newErrors: { [key: string]: string } = {};

    if (!calculatedCost || calculatedCost <= 0) {
      newErrors.cost = 'Cost must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async () => {
    if (!validateMedicationDetails()) {
      return;
    }

    const editRequest: EditOrderRequest = {
      orderId: order.orderId,
      editedDetails,
      pharmacistNotes: pharmacistNotes.trim() || undefined
    };

    await onEdit(editRequest);
    setActionMode('review');
  };

  const handleApprove = async () => {
    if (!validateApproval()) {
      return;
    }

    const approveRequest: ApproveOrderRequest = {
      orderId: order.orderId,
      calculatedCost,
      pharmacistNotes: pharmacistNotes.trim() || undefined,
      editedDetails: hasChanges() ? editedDetails : undefined
    };

    await onApprove(approveRequest);
    setShowApproveConfirm(false);
  };

  const handleReject = async (rejectionReason: string, notes?: string) => {
    const rejectRequest: RejectOrderRequest = {
      orderId: order.orderId,
      rejectionReason,
      pharmacistNotes: notes
    };

    await onReject(rejectRequest);
    setShowRejectDialog(false);
  };

  const hasChanges = () => {
    return (
      editedDetails.name !== (order.medicationDetails?.name || '') ||
      editedDetails.dosage !== (order.medicationDetails?.dosage || '') ||
      editedDetails.quantity !== (order.medicationDetails?.quantity || 0)
    );
  };

  const resetChanges = () => {
    setEditedDetails({
      name: order.medicationDetails?.name || '',
      dosage: order.medicationDetails?.dosage || '',
      quantity: order.medicationDetails?.quantity || 0
    });
    setErrors({});
  };

  // Status update handler with confirmation
  const handleStatusUpdate = async (status: PrescriptionOrderStatus) => {
    const statusInfo = getStatusInfo(status);
    setStatusUpdateDialog({
      isOpen: true,
      status,
      title: statusInfo.title,
      message: statusInfo.message
    });
  };

  const confirmStatusUpdate = async () => {
    if (!statusUpdateDialog.status) return;

    try {
      await onStatusUpdate(statusUpdateDialog.status, onStatusUpdateComplete);
      setStatusUpdateDialog({ isOpen: false, status: null, title: '', message: '' });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const cancelStatusUpdate = () => {
    setStatusUpdateDialog({ isOpen: false, status: null, title: '', message: '' });
  };

  const getStatusInfo = (status: PrescriptionOrderStatus) => {
    switch (status) {
      case 'preparing':
        return {
          title: 'Mark as Preparing',
          message: 'Are you sure you want to mark this order as preparing? The patient will be notified that their medication is being prepared.'
        };
      case 'out_for_delivery':
        return {
          title: 'Mark as Ready for Delivery',
          message: 'Are you sure you want to mark this order as ready for delivery? The patient will be notified that their medication is ready for pickup/delivery.'
        };
      default:
        return { title: '', message: '' };
    }
  };

  // Check if status update buttons should be shown
  const canUpdateStatus = () => {
    return ['awaiting_payment', 'preparing', 'out_for_delivery'].includes(order.status);
  };

  const shouldShowPreparingButton = () => {
    return order.status === 'awaiting_payment';
  };

  const shouldShowReadyButton = () => {
    return order.status === 'preparing';
  };

  if (actionMode === 'edit') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Edit Medication Details</h4>
        
        <div className="space-y-4">
          {/* Medication Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medication Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editedDetails.name}
              onChange={(e) => {
                setEditedDetails({ ...editedDetails, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter medication name"
              disabled={isLoading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Dosage and Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dosage <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editedDetails.dosage}
                onChange={(e) => {
                  setEditedDetails({ ...editedDetails, dosage: e.target.value });
                  if (errors.dosage) setErrors({ ...errors, dosage: '' });
                }}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dosage ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="e.g., 500mg"
                disabled={isLoading}
              />
              {errors.dosage && <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={editedDetails.quantity}
                onChange={(e) => {
                  setEditedDetails({ ...editedDetails, quantity: parseInt(e.target.value) || 0 });
                  if (errors.quantity) setErrors({ ...errors, quantity: '' });
                }}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="0"
                disabled={isLoading}
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
            </div>
          </div>

          {/* Pharmacist Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={pharmacistNotes}
              onChange={(e) => setPharmacistNotes(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Add any notes about the edits..."
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                resetChanges();
                setActionMode('review');
              }}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (actionMode === 'approve') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Approve Prescription</h4>
        
        <div className="space-y-4">
          {/* Cost Calculation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={calculatedCost}
                onChange={(e) => {
                  setCalculatedCost(parseFloat(e.target.value) || 0);
                  if (errors.cost) setErrors({ ...errors, cost: '' });
                }}
                className={`block w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cost ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="0.00"
                disabled={isLoading}
              />
            </div>
            {errors.cost && <p className="mt-1 text-sm text-red-600">{errors.cost}</p>}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Prescription Summary</h5>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Medication:</strong> {editedDetails.name || 'Not specified'}</p>
              <p><strong>Dosage:</strong> {editedDetails.dosage || 'Not specified'}</p>
              <p><strong>Quantity:</strong> {editedDetails.quantity || 'Not specified'}</p>
              {hasChanges() && (
                <p className="text-blue-600"><strong>Note:</strong> Changes will be saved with approval</p>
              )}
            </div>
          </div>

          {/* Pharmacist Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Notes (Optional)
            </label>
            <textarea
              value={pharmacistNotes}
              onChange={(e) => setPharmacistNotes(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Add any notes about the approval..."
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setActionMode('review')}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Approving...
                </>
              ) : (
                'Confirm Approval'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default review mode
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Pharmacist Actions</h4>
      
      {/* Regular Action Buttons (only show if not in fulfillment stage) */}
      {!canUpdateStatus() && (
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setActionMode('approve')}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Approve
          </button>

          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Reject
          </button>

          <button
            onClick={() => setActionMode('edit')}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit Details
          </button>
        </div>
      )}

      {/* Status Update Buttons */}
      {canUpdateStatus() && (
        <div className="mb-4">
          <h5 className="text-md font-medium text-gray-900 mb-3">Order Fulfillment</h5>
          <div className="flex flex-wrap gap-3">
            {shouldShowPreparingButton() && (
              <button
                onClick={() => handleStatusUpdate('preparing')}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Mark as Preparing
                  </>
                )}
              </button>
            )}

            {shouldShowReadyButton() && (
              <button
                onClick={() => handleStatusUpdate('out_for_delivery')}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Mark as Ready for Delivery
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current Status Information */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-800">
              Current Status: <span className="capitalize">{order.status.replace('_', ' ')}</span>
            </h5>
            <p className="text-sm text-blue-700 mt-1">
              {canUpdateStatus() 
                ? "Use the buttons above to update the order status as you prepare it."
                : "Please review the prescription details and choose an appropriate action. All actions will create an audit trail and notify the patient."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Status Update Confirmation Dialog */}
      {statusUpdateDialog.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">{statusUpdateDialog.title}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">{statusUpdateDialog.message}</p>
              </div>
              <div className="flex justify-center space-x-3 px-4 py-3">
                <button
                  onClick={cancelStatusUpdate}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusUpdate}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        isLoading={isLoading}
      />
    </div>
  );
};