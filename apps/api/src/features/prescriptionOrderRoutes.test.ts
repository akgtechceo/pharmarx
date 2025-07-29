import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prescriptionOrderRoutes } from './prescriptionOrderRoutes';
import { receiptService } from './receiptService';
import { CreatePrescriptionOrderInput, PrescriptionOrder } from '@pharmarx/shared-types';

// Mock dependencies - hoisted
vi.mock('./ocrService', () => ({
  ocrService: {
    validateImageForOCR: vi.fn(),
    processImage: vi.fn()
  }
}));

vi.mock('./database', () => ({
  db: {
    collection: vi.fn()
  }
}));

vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      Timestamp: {
        fromDate: vi.fn((date) => ({ toDate: () => date }))
      }
    }
  }
}));

const app = express();
app.use(express.json());
app.use('/api', prescriptionOrderRoutes);

describe('Prescription Order Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /orders', () => {
    const mockOrderInput: CreatePrescriptionOrderInput = {
      patientProfileId: 'patient-123',
      originalImageUrl: 'https://example.com/prescription.jpg'
    };

    beforeEach(() => {
      vi.mocked(require('./ocrService')).ocrService.validateImageForOCR.mockReturnValue({
        isValid: true,
        errors: []
      });

      const mockDocRef = {
        id: 'generated-order-id',
        set: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn(() => mockDocRef)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue(mockCollection);
    });

    it('should create prescription order and trigger OCR processing', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(mockOrderInput)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientProfileId).toBe(mockOrderInput.patientProfileId);
      expect(response.body.data.originalImageUrl).toBe(mockOrderInput.originalImageUrl);
      expect(response.body.data.ocrStatus).toBe('pending');
      expect(response.body.message).toContain('OCR processing initiated');
    });

    it('should return 400 for missing patient profile ID', async () => {
      const invalidInput = { ...mockOrderInput, patientProfileId: '' };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidInput)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Patient profile ID is required');
    });

    it('should return 400 for missing image URL', async () => {
      const invalidInput = { ...mockOrderInput, originalImageUrl: '' };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidInput)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Original image URL is required');
    });

    it('should return 400 for invalid image URL', async () => {
      vi.mocked(require('./ocrService')).ocrService.validateImageForOCR.mockReturnValue({
        isValid: false,
        errors: ['Invalid image format', 'Unsupported file type']
      });

      const response = await request(app)
        .post('/api/orders')
        .send(mockOrderInput)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid image for OCR');
    });

    it('should handle database errors during order creation', async () => {
      const mockDocRef = {
        id: 'test-id',
        set: vi.fn().mockRejectedValue(new Error('Database write failed'))
      };

      const mockCollection = {
        doc: vi.fn(() => mockDocRef)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post('/api/orders')
        .send(mockOrderInput)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error during order creation');
    });
  });

  describe('GET /orders', () => {
    const patientId = 'patient-456';

    it('should return orders for valid patient', async () => {
      const mockOrders = [
        {
          orderId: 'order-1',
          patientProfileId: patientId,
          status: 'pending_verification',
          originalImageUrl: 'https://example.com/image1.jpg',
          ocrStatus: 'completed',
          extractedText: 'Prescription text 1',
          createdAt: { toDate: () => new Date('2025-01-01') },
          updatedAt: { toDate: () => new Date('2025-01-01') }
        },
        {
          orderId: 'order-2',
          patientProfileId: patientId,
          status: 'preparing',
          originalImageUrl: 'https://example.com/image2.jpg',
          ocrStatus: 'failed',
          ocrError: 'Processing error',
          createdAt: { toDate: () => new Date('2025-01-02') },
          updatedAt: { toDate: () => new Date('2025-01-02') }
        }
      ];

      const mockSnapshot = {
        docs: mockOrders.map(order => ({
          data: () => order
        }))
      };

      const mockQuery = {
        get: vi.fn().mockResolvedValue(mockSnapshot)
      };

      const mockCollection = {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => mockQuery)
        }))
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .get(`/api/orders?patientId=${patientId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].orderId).toBe('order-1');
      expect(response.body.data[1].orderId).toBe('order-2');
    });

    it('should return 400 for missing patient ID', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Patient ID is required');
    });

    it('should return empty array for patient with no orders', async () => {
      const mockSnapshot = { docs: [] };
      const mockQuery = {
        get: vi.fn().mockResolvedValue(mockSnapshot)
      };

      const mockCollection = {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => mockQuery)
        }))
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .get(`/api/orders?patientId=${patientId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /orders/:orderId', () => {
    const orderId = 'specific-order-789';

    it('should return specific order by ID', async () => {
      const mockOrderData = {
        orderId,
        patientProfileId: 'patient-123',
        status: 'awaiting_payment',
        originalImageUrl: 'https://example.com/prescription.jpg',
        ocrStatus: 'completed',
        extractedText: 'Sample prescription text',
        createdAt: { toDate: () => new Date('2025-01-01') },
        updatedAt: { toDate: () => new Date('2025-01-02') },
        ocrProcessedAt: { toDate: () => new Date('2025-01-01T10:30:00Z') }
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(orderId);
      expect(response.body.data.extractedText).toBe('Sample prescription text');
    });

    it('should return 404 for non-existent order', async () => {
      const mockDoc = { exists: false };
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('PUT /orders/:orderId/status', () => {
    const orderId = 'status-update-order';

    it('should update order status successfully', async () => {
      const newStatus = 'preparing';
      const mockOrderData = {
        orderId,
        status: 'awaiting_payment'
      };

      const mockUpdatedData = {
        ...mockOrderData,
        status: newStatus,
        updatedAt: { toDate: () => new Date() }
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };

      const mockUpdatedDoc = {
        data: () => mockUpdatedData
      };

      const mockDocRef = {
        get: vi.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: vi.fn()
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: newStatus })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(newStatus);
      expect(response.body.message).toBe('Order status updated successfully');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });
  });

  describe('PUT /orders/:orderId/manual-text', () => {
    const orderId = 'manual-text-order';
    const extractedText = 'Manually entered prescription text';

    it('should accept manual text entry when OCR failed', async () => {
      const mockOrderData = {
        orderId,
        ocrStatus: 'failed',
        ocrError: 'OCR processing failed'
      };

      const mockUpdatedData = {
        ...mockOrderData,
        ocrStatus: 'completed',
        extractedText,
        ocrProcessedAt: { toDate: () => new Date() }
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };

      const mockUpdatedDoc = {
        data: () => mockUpdatedData
      };

      const mockDocRef = {
        get: vi.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: vi.fn()
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .put(`/api/orders/${orderId}/manual-text`)
        .send({ extractedText })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.extractedText).toBe(extractedText);
      expect(response.body.data.ocrStatus).toBe('completed');
      expect(response.body.message).toBe('Manual text entry completed successfully');
    });

    it('should accept manual text entry when OCR pending', async () => {
      const mockOrderData = {
        orderId,
        ocrStatus: 'pending'
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };

      const mockUpdatedDoc = {
        data: () => ({
          ...mockOrderData,
          extractedText,
          ocrStatus: 'completed'
        })
      };

      const mockDocRef = {
        get: vi.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: vi.fn()
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .put(`/api/orders/${orderId}/manual-text`)
        .send({ extractedText })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 409 if OCR already completed', async () => {
      const mockOrderData = {
        orderId,
        ocrStatus: 'completed',
        extractedText: 'Already processed text'
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .put(`/api/orders/${orderId}/manual-text`)
        .send({ extractedText })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('OCR has already completed successfully');
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/manual-text`)
        .send({ extractedText: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Extracted text is required');
    });

    it('should return 404 for non-existent order', async () => {
      const mockDoc = { exists: false };
      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .put(`/api/orders/${orderId}/manual-text`)
        .send({ extractedText })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('OCR processing integration', () => {
    it('should validate image before processing', async () => {
      const mockOrderInput: CreatePrescriptionOrderInput = {
        patientProfileId: 'patient-123',
        originalImageUrl: 'https://example.com/invalid-format.txt'
      };

      vi.mocked(require('./ocrService')).ocrService.validateImageForOCR.mockReturnValue({
        isValid: false,
        errors: ['Invalid file format']
      });

      const response = await request(app)
        .post('/api/orders')
        .send(mockOrderInput)
        .expect(400);

      expect(vi.mocked(require('./ocrService')).ocrService.validateImageForOCR).toHaveBeenCalledWith(
        mockOrderInput.originalImageUrl
      );
    });
  });
});

describe('Order History Endpoints', () => {
  const mockPatientId = 'patient-123';
  const mockOrderId = 'order-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /orders/history', () => {
    it('should return order history with pagination', async () => {
      const mockCountData = { count: 2 };
      const mockCountSnapshot = { data: () => mockCountData };
      const mockOrdersSnapshot = {
        docs: [
          {
            id: 'order-123',
            data: () => ({
              status: 'delivered',
              medicationDetails: { name: 'Aspirin', dosage: '500mg', quantity: 1 },
              cost: 1500,
              createdAt: { toDate: () => new Date('2024-01-01') },
              updatedAt: { toDate: () => new Date('2024-01-02') }
            })
          },
          {
            id: 'order-456',
            data: () => ({
              status: 'preparing',
              medicationDetails: { name: 'Ibuprofen', dosage: '400mg', quantity: 2 },
              cost: 2000,
              createdAt: { toDate: () => new Date('2024-01-03') },
              updatedAt: { toDate: () => new Date('2024-01-03') }
            })
          }
        ]
      };
      const mockPaymentsSnapshot = {
        docs: [
          {
            data: () => ({
              orderId: 'order-123',
              receiptId: 'receipt-123'
            })
          }
        ]
      };

      const mockCollection = vi.fn();
      const mockWhere = vi.fn();
      const mockOrderBy = vi.fn();
      const mockLimit = vi.fn();
      const mockOffset = vi.fn();
      const mockGet = vi.fn();
      const mockCount = vi.fn();

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet,
        count: mockCount
      });

      mockWhere.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet,
        count: mockCount
      });

      mockOrderBy.mockReturnValue({
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
        get: mockGet
      });

      mockOffset.mockReturnValue({
        get: mockGet
      });

      mockCount.mockResolvedValue(mockCountSnapshot);
      mockGet
        .mockResolvedValueOnce(mockOrdersSnapshot) // First call for orders
        .mockResolvedValueOnce(mockPaymentsSnapshot); // Second call for payments

      const response = await request(app)
        .get('/orders/history')
        .query({ patientId: mockPatientId, page: '1', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        hasMore: false
      });
      expect(response.body.data.orders[0].hasReceipt).toBe(true);
      expect(response.body.data.orders[1].hasReceipt).toBe(false);
    });

    it('should return 400 if patientId is missing', async () => {
      const response = await request(app)
        .get('/orders/history')
        .query({ page: '1', limit: '10' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Patient ID is required');
    });

    it('should handle pagination correctly', async () => {
      const mockCountData = { count: 25 };
      const mockCountSnapshot = { data: () => mockCountData };
      const mockOrdersSnapshot = { docs: [] };
      const mockPaymentsSnapshot = { docs: [] };

      const mockCollection = vi.fn();
      const mockWhere = vi.fn();
      const mockOrderBy = vi.fn();
      const mockLimit = vi.fn();
      const mockOffset = vi.fn();
      const mockGet = vi.fn();
      const mockCount = vi.fn();

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet,
        count: mockCount
      });

      mockWhere.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet,
        count: mockCount
      });

      mockOrderBy.mockReturnValue({
        limit: mockLimit,
        offset: mockOffset,
        get: mockGet
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
        get: mockGet
      });

      mockOffset.mockReturnValue({
        get: mockGet
      });

      mockCount.mockResolvedValue(mockCountSnapshot);
      mockGet
        .mockResolvedValueOnce(mockOrdersSnapshot)
        .mockResolvedValueOnce(mockPaymentsSnapshot);

      const response = await request(app)
        .get('/orders/history')
        .query({ patientId: mockPatientId, page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        hasMore: true
      });
    });
  });

  describe('Receipt Download Endpoints', () => {
    const mockPatientId = 'patient-123';
    const mockOrderId = 'order-123';

    it('should download receipt for delivered order', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: mockPatientId,
          status: 'delivered',
          createdAt: { toDate: () => new Date('2024-01-01') },
          updatedAt: { toDate: () => new Date('2024-01-02') }
        })
      };

      const mockPaymentDoc = {
        data: () => ({
          paymentId: 'payment-123',
          orderId: mockOrderId,
          amount: 1500,
          status: 'succeeded'
        })
      };

      const mockPaymentsSnapshot = {
        empty: false,
        docs: [mockPaymentDoc]
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockOrderDoc)
      };

      const mockCollection = vi.fn();
      const mockWhere = vi.fn();
      const mockLimit = vi.fn();

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef),
        where: mockWhere,
        limit: mockLimit
      });

      mockWhere.mockReturnValue({
        limit: mockLimit
      });

      mockLimit.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockPaymentsSnapshot)
      });

      // Mock receipt service
      vi.mocked(require('./receiptService')).receiptService.generateReceiptForPayment.mockResolvedValue({
        pdfBuffer: Buffer.from('fake-pdf-content'),
        receiptId: 'receipt-123'
      });

      const response = await request(app)
        .get(`/orders/${mockOrderId}/receipt`)
        .query({ patientId: mockPatientId });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toBe(`attachment; filename="receipt-${mockOrderId}.pdf"`);
      expect(response.body).toEqual(Buffer.from('fake-pdf-content'));
    });

    it('should return 404 if order not found', async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({ exists: false })
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .get(`/orders/${mockOrderId}/receipt`)
        .query({ patientId: mockPatientId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return 403 if order does not belong to patient', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: 'different-patient',
          status: 'delivered'
        })
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockOrderDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .get(`/orders/${mockOrderId}/receipt`)
        .query({ patientId: mockPatientId });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied: Order does not belong to patient');
    });

    it('should return 400 if order is not delivered', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: mockPatientId,
          status: 'preparing'
        })
      };

      const mockDocRef = {
        get: vi.fn().mockResolvedValue(mockOrderDoc)
      };

      vi.mocked(require('./database')).db.collection.mockReturnValue({
        doc: vi.fn(() => mockDocRef)
      });

      const response = await request(app)
        .get(`/orders/${mockOrderId}/receipt`)
        .query({ patientId: mockPatientId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Receipt can only be generated for delivered orders');
    });

    it('should return 400 if patientId is missing', async () => {
      const response = await request(app)
        .get(`/orders/${mockOrderId}/receipt`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Patient ID is required');
    });
  });
}); 