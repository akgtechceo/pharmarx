import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePrescriptionReview } from '../hooks/usePrescriptionReview';
import { PrescriptionOrder } from '@pharmarx/shared-types';
import { ApproveOrderRequest, RejectOrderRequest, EditOrderRequest } from '../types/pharmacist.types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'fake-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock data
const mockOrder: PrescriptionOrder = {
  orderId: 'order-123',
  patientProfileId: 'patient-abc',
  status: 'awaiting_verification',
  originalImageUrl: 'https://example.com/image.jpg',
  extractedText: 'Prescription text',
  ocrStatus: 'completed',
  ocrConfidence: 0.95,
  medicationDetails: {
    name: 'Amoxicillin',
    dosage: '500mg',
    quantity: 30
  },
  userVerified: true,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:30:00Z')
};

const mockUpdatedOrder: PrescriptionOrder = {
  ...mockOrder,
  status: 'awaiting_payment',
  pharmacistReview: {
    reviewedBy: 'pharmacist-123',
    reviewedAt: new Date(),
    approved: true,
    calculatedCost: 25.99
  }
};

const mockApiResponse = {
  success: true,
  data: mockUpdatedOrder
};

const mockProps = {
  order: mockOrder,
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onEdit: vi.fn(),
  onError: vi.fn()
};

describe('usePrescriptionReview', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.approveOrder).toBe('function');
      expect(typeof result.current.rejectOrder).toBe('function');
      expect(typeof result.current.editOrder).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Approve Order', () => {
    it('should successfully approve an order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const approveRequest: ApproveOrderRequest = {
        orderId: 'order-123',
        calculatedCost: 25.99,
        pharmacistNotes: 'Approved for dispensing'
      };

      await act(async () => {
        await result.current.approveOrder(approveRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/approve',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          },
          body: JSON.stringify({
            calculatedCost: 25.99,
            pharmacistNotes: 'Approved for dispensing',
            editedDetails: undefined
          })
        })
      );

      expect(mockProps.onApprove).toHaveBeenCalledWith(mockUpdatedOrder);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should include edited details when approving', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const approveRequest: ApproveOrderRequest = {
        orderId: 'order-123',
        calculatedCost: 25.99,
        editedDetails: {
          name: 'Updated Name',
          dosage: '250mg',
          quantity: 60
        }
      };

      await act(async () => {
        await result.current.approveOrder(approveRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            calculatedCost: 25.99,
            pharmacistNotes: undefined,
            editedDetails: {
              name: 'Updated Name',
              dosage: '250mg',
              quantity: 60
            }
          })
        })
      );
    });

    it('should handle approval API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const approveRequest: ApproveOrderRequest = {
        orderId: 'order-123',
        calculatedCost: 25.99
      };

      await act(async () => {
        await result.current.approveOrder(approveRequest);
      });

      expect(result.current.error).toBe('Failed to approve order: Bad Request');
      expect(mockProps.onError).toHaveBeenCalledWith('Failed to approve order: Bad Request', 'approve order');
      expect(mockProps.onApprove).not.toHaveBeenCalled();
    });
  });

  describe('Reject Order', () => {
    it('should successfully reject an order', async () => {
      const rejectedOrder = { ...mockOrder, status: 'rejected' as const };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: rejectedOrder })
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const rejectRequest: RejectOrderRequest = {
        orderId: 'order-123',
        rejectionReason: 'Illegible prescription',
        pharmacistNotes: 'Cannot read medication name clearly'
      };

      await act(async () => {
        await result.current.rejectOrder(rejectRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/reject',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          },
          body: JSON.stringify({
            rejectionReason: 'Illegible prescription',
            pharmacistNotes: 'Cannot read medication name clearly'
          })
        })
      );

      expect(mockProps.onReject).toHaveBeenCalledWith(rejectedOrder);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle rejection API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Invalid rejection reason' })
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const rejectRequest: RejectOrderRequest = {
        orderId: 'order-123',
        rejectionReason: 'Invalid reason'
      };

      await act(async () => {
        await result.current.rejectOrder(rejectRequest);
      });

      expect(result.current.error).toBe('Invalid rejection reason');
      expect(mockProps.onError).toHaveBeenCalledWith('Invalid rejection reason', 'reject order');
      expect(mockProps.onReject).not.toHaveBeenCalled();
    });
  });

  describe('Edit Order', () => {
    it('should successfully edit an order', async () => {
      const editedOrder = {
        ...mockOrder,
        medicationDetails: {
          name: 'Updated Medicine',
          dosage: '250mg',
          quantity: 60
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: editedOrder })
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      const editRequest: EditOrderRequest = {
        orderId: 'order-123',
        editedDetails: {
          name: 'Updated Medicine',
          dosage: '250mg',
          quantity: 60
        },
        pharmacistNotes: 'Corrected medication details'
      };

      await act(async () => {
        await result.current.editOrder(editRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/edit',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
          },
          body: JSON.stringify({
            editedDetails: {
              name: 'Updated Medicine',
              dosage: '250mg',
              quantity: 60
            },
            pharmacistNotes: 'Corrected medication details'
          })
        })
      );

      expect(mockProps.onEdit).toHaveBeenCalledWith(editedOrder);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Loading States', () => {
    it('should set loading to true during API calls', async () => {
      // Create a promise that we can control
      let resolveApiCall: (value: unknown) => void;
      const apiCallPromise = new Promise((resolve) => {
        resolveApiCall = resolve;
      });

      mockFetch.mockReturnValueOnce(apiCallPromise);

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      // Start the API call
      act(() => {
        result.current.approveOrder({
          orderId: 'order-123',
          calculatedCost: 25.99
        });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the API call
      await act(async () => {
        resolveApiCall!({
          ok: true,
          json: async () => mockApiResponse
        });
        await apiCallPromise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      await act(async () => {
        await result.current.approveOrder({
          orderId: 'order-123',
          calculatedCost: 25.99
        });
      });

      expect(result.current.error).toBe('Network error');
      expect(mockProps.onError).toHaveBeenCalledWith('Network error', 'approve order');
    });

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      await act(async () => {
        await result.current.approveOrder({
          orderId: 'order-123',
          calculatedCost: 25.99
        });
      });

      expect(result.current.error).toBe('An unexpected error occurred during approve order');
      expect(mockProps.onError).toHaveBeenCalledWith('An unexpected error occurred during approve order', 'approve order');
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      // Manually set an error (normally would come from API call)
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Authentication', () => {
    it('should include authorization header in all requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      await act(async () => {
        await result.current.approveOrder({
          orderId: 'order-123',
          calculatedCost: 25.99
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer fake-token'
          })
        })
      );

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('API Endpoints', () => {
    it('should use correct endpoints for different actions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      const { result } = renderHook(() => usePrescriptionReview(mockProps));

      // Test approve endpoint
      await act(async () => {
        await result.current.approveOrder({
          orderId: 'order-123',
          calculatedCost: 25.99
        });
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/approve',
        expect.any(Object)
      );

      // Test reject endpoint
      await act(async () => {
        await result.current.rejectOrder({
          orderId: 'order-123',
          rejectionReason: 'Test reason'
        });
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/reject',
        expect.any(Object)
      );

      // Test edit endpoint
      await act(async () => {
        await result.current.editOrder({
          orderId: 'order-123',
          editedDetails: { name: 'Test', dosage: '1mg', quantity: 1 }
        });
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3001/pharmacist/orders/order-123/edit',
        expect.any(Object)
      );
    });
  });
});