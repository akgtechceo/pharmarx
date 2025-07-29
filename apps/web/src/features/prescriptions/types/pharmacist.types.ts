import { PrescriptionOrder, PharmacistReview, ApiResponse } from '@pharmarx/shared-types';

// Queue management types
export interface PharmacistQueueFilters {
  medicationType?: string;
  urgency?: 'high' | 'medium' | 'low';
  dateRange?: {
    start: Date;
    end: Date;
  };
  patientName?: string;
}

export interface PharmacistQueueSort {
  field: 'createdAt' | 'medicationType' | 'patientName' | 'urgency';
  direction: 'asc' | 'desc';
}

export interface PharmacistQueueState {
  orders: PrescriptionOrder[];
  isLoading: boolean;
  error: string | null;
  filters: PharmacistQueueFilters;
  sort: PharmacistQueueSort;
  currentPage: number;
  totalPages: number;
  totalOrders: number;
}

// Review actions types
export interface ApproveOrderRequest {
  orderId: string;
  calculatedCost: number;
  pharmacistNotes?: string;
  editedDetails?: {
    name?: string;
    dosage?: string;
    quantity?: number;
  };
}

export interface RejectOrderRequest {
  orderId: string;
  rejectionReason: string;
  pharmacistNotes?: string;
}

export interface EditOrderRequest {
  orderId: string;
  editedDetails: {
    name?: string;
    dosage?: string;
    quantity?: number;
  };
  pharmacistNotes?: string;
}

// API response types
export interface PharmacistOrdersResponse extends ApiResponse<{
  orders: PrescriptionOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {}

export interface PharmacistActionResponse extends ApiResponse<PrescriptionOrder> {}

// Hook props types
export interface UsePharmacistQueueProps {
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePrescriptionReviewProps {
  order: PrescriptionOrder;
  onApprove?: (updatedOrder: PrescriptionOrder) => void;
  onReject?: (updatedOrder: PrescriptionOrder) => void;
  onEdit?: (updatedOrder: PrescriptionOrder) => void;
  onError?: (error: string, action: string) => void;
}

// Component props types
export interface PharmacistQueueProps {
  className?: string;
}

export interface PrescriptionReviewProps {
  order: PrescriptionOrder;
  onClose: () => void;
  onActionComplete: (updatedOrder: PrescriptionOrder) => void;
}

export interface ReviewActionsProps {
  order: PrescriptionOrder;
  onApprove: (request: ApproveOrderRequest) => Promise<void>;
  onReject: (request: RejectOrderRequest) => Promise<void>;
  onEdit: (request: EditOrderRequest) => Promise<void>;
  isLoading: boolean;
}

export interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => void;
  isLoading: boolean;
}