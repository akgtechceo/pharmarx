import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { prescriptionService } from './prescriptionService';
import { PrescriptionOrder, CreatePrescriptionOrderInput } from '@pharmarx/shared-types';

// Mock fetch
global.fetch = vi.fn();

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public upload = {
    addEventListener: vi.fn()
  };
  public addEventListener = vi.fn();
  public open = vi.fn();
  public setRequestHeader = vi.fn();
  public send = vi.fn();
  public abort = vi.fn();
  public status = 200;
  public responseText = '{"url": "https://example.com/uploaded-file.jpg"}';
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

global.XMLHttpRequest = MockXMLHttpRequest as any;

describe('PrescriptionService', () => {
  let mockXHR: MockXMLHttpRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockXHR = new MockXMLHttpRequest();
    localStorageMock.getItem.mockReturnValue('mock-firebase-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadPrescriptionFile', () => {
    it('should upload file successfully', async () => {
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const onProgress = vi.fn();

      // Mock successful XMLHttpRequest
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      const result = await prescriptionService.uploadPrescriptionFile(file, { onProgress });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com/uploaded-file.jpg');
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://localhost:3001/uploads/prescription');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer mock-firebase-token');
    });

    it('should handle upload progress', async () => {
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const onProgress = vi.fn();

      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          // Simulate progress event
          const progressEvent = {
            lengthComputable: true,
            loaded: 50,
            total: 100
          };
          mockXHR.upload.addEventListener.mock.calls
            .find(call => call[0] === 'progress')?.[1](progressEvent);

          // Simulate completion
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      await prescriptionService.uploadPrescriptionFile(file, { onProgress });

      expect(onProgress).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50
      });
    });

    it('should handle upload errors', async () => {
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });

      mockXHR.status = 500;
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      const result = await prescriptionService.uploadPrescriptionFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed with status 500');
    });

    it('should handle network errors', async () => {
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });

      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'error')?.[1]();
        }, 0);
        return mockXHR as any;
      });

      const result = await prescriptionService.uploadPrescriptionFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error during upload');
    });

    it('should handle abort signal', async () => {
      const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
      const abortController = new AbortController();

      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          abortController.abort();
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'abort')?.[1]();
        }, 0);
        return mockXHR as any;
      });

      const result = await prescriptionService.uploadPrescriptionFile(file, {
        signal: abortController.signal
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload cancelled');
    });
  });

  describe('createPrescriptionOrder', () => {
    const mockOrderData: CreatePrescriptionOrderInput = {
      patientProfileId: 'patient-123',
      originalImageUrl: 'https://example.com/prescription.jpg'
    };

    const mockOrder: PrescriptionOrder = {
      orderId: 'order-123',
      patientProfileId: 'patient-123',
      status: 'pending_verification',
      originalImageUrl: 'https://example.com/prescription.jpg',
      createdAt: new Date()
    };

    it('should create prescription order successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOrder
        })
      });

      const result = await prescriptionService.createPrescriptionOrder(mockOrderData);

      expect(result).toEqual(mockOrder);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-firebase-token'
          }),
          body: JSON.stringify({
            ...mockOrderData,
            status: 'pending_verification'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request data'
        })
      });

      await expect(prescriptionService.createPrescriptionOrder(mockOrderData))
        .rejects.toThrow('Invalid request data');
    });

    it('should handle missing authentication token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      await expect(prescriptionService.createPrescriptionOrder(mockOrderData))
        .rejects.toThrow('Authentication token not found');
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(prescriptionService.createPrescriptionOrder(mockOrderData))
        .rejects.toThrow('Network error');
    });
  });

  describe('uploadPrescription', () => {
    const file = new File(['test content'], 'prescription.jpg', { type: 'image/jpeg' });
    const patientProfileId = 'patient-123';

    const mockOrder: PrescriptionOrder = {
      orderId: 'order-123',
      patientProfileId: 'patient-123',
      status: 'pending_verification',
      originalImageUrl: 'https://example.com/prescription.jpg',
      createdAt: new Date()
    };

    it('should complete full upload workflow', async () => {
      // Mock file upload
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      // Mock order creation
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOrder
        })
      });

      const result = await prescriptionService.uploadPrescription(file, patientProfileId);

      expect(result).toEqual(mockOrder);
    });

    it('should handle file upload failure', async () => {
      mockXHR.status = 500;
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      await expect(prescriptionService.uploadPrescription(file, patientProfileId))
        .rejects.toThrow('Upload failed with status 500');
    });

    it('should handle order creation failure after successful file upload', async () => {
      // Mock successful file upload
      vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
        setTimeout(() => {
          const loadEvent = { target: mockXHR } as any;
          mockXHR.addEventListener.mock.calls
            .find(call => call[0] === 'load')?.[1](loadEvent);
        }, 0);
        return mockXHR as any;
      });

      // Mock failed order creation
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Failed to create order'
        })
      });

      await expect(prescriptionService.uploadPrescription(file, patientProfileId))
        .rejects.toThrow('Failed to create order');
    });
  });

  describe('getPrescriptionOrders', () => {
    const patientId = 'patient-123';
    const mockOrders: PrescriptionOrder[] = [
      {
        orderId: 'order-1',
        patientProfileId: patientId,
        status: 'pending_verification',
        originalImageUrl: 'https://example.com/prescription1.jpg',
        createdAt: new Date()
      },
      {
        orderId: 'order-2',
        patientProfileId: patientId,
        status: 'awaiting_payment',
        originalImageUrl: 'https://example.com/prescription2.jpg',
        createdAt: new Date()
      }
    ];

    it('should fetch prescription orders successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOrders
        })
      });

      const result = await prescriptionService.getPrescriptionOrders(patientId);

      expect(result).toEqual(mockOrders);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/orders?patientId=${patientId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-firebase-token'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(prescriptionService.getPrescriptionOrders(patientId))
        .rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('getPrescriptionOrder', () => {
    const orderId = 'order-123';
    const mockOrder: PrescriptionOrder = {
      orderId,
      patientProfileId: 'patient-123',
      status: 'pending_verification',
      originalImageUrl: 'https://example.com/prescription.jpg',
      createdAt: new Date()
    };

    it('should fetch prescription order successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOrder
        })
      });

      const result = await prescriptionService.getPrescriptionOrder(orderId);

      expect(result).toEqual(mockOrder);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/orders/${orderId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-firebase-token'
          })
        })
      );
    });
  });

  describe('updatePrescriptionOrderStatus', () => {
    const orderId = 'order-123';
    const newStatus = 'awaiting_payment';
    const mockUpdatedOrder: PrescriptionOrder = {
      orderId,
      patientProfileId: 'patient-123',
      status: 'awaiting_payment',
      originalImageUrl: 'https://example.com/prescription.jpg',
      createdAt: new Date()
    };

    it('should update prescription order status successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUpdatedOrder
        })
      });

      const result = await prescriptionService.updatePrescriptionOrderStatus(orderId, newStatus);

      expect(result).toEqual(mockUpdatedOrder);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/orders/${orderId}`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-firebase-token'
          }),
          body: JSON.stringify({ status: newStatus })
        })
      );
    });
  });
}); 