import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ocrRoutes } from './ocrRoutes';
import { OCRStatusResponse } from '@pharmarx/shared-types';

// Mock dependencies - hoisted
vi.mock('./ocrService', () => ({
  ocrService: {
    processImage: vi.fn(),
    validateImageForOCR: vi.fn(),
    healthCheck: vi.fn()
  }
}));

vi.mock('./database', () => ({
  db: {
    collection: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api', ocrRoutes);

describe('OCR Routes', () => {
  let mockOcrService: any;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mock functions from the mocked modules
    const { ocrService } = await import('./ocrService');
    const { db } = await import('./database');
    mockOcrService = ocrService as any;
    mockDb = db as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /orders/:orderId/process-ocr', () => {
    const orderId = 'test-order-123';
    const mockOrderData = {
      orderId,
      originalImageUrl: 'https://example.com/prescription.jpg',
      ocrStatus: 'pending'
    };

    beforeEach(() => {
      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);
    });

    it('should start OCR processing for valid order', async () => {
      mockOcrService.validateImageForOCR.mockReturnValue({
        isValid: true,
        errors: []
      });

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(orderId);
      expect(response.body.data.status).toBe('processing');
      expect(response.body.message).toBe('OCR processing started');
    });

    it('should return 404 for non-existent order', async () => {
      const mockDoc = { exists: false };
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return 400 for order without image URL', async () => {
      const mockOrderDataNoImage = { ...mockOrderData, originalImageUrl: null };
      const mockDoc = {
        exists: true,
        data: () => mockOrderDataNoImage
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image URL found for this order');
    });

    it('should return 409 if OCR already in progress', async () => {
      const mockOrderDataProcessing = { ...mockOrderData, ocrStatus: 'processing' };
      const mockDoc = {
        exists: true,
        data: () => mockOrderDataProcessing
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('OCR processing already in progress for this order');
    });

    it('should return completed OCR if already processed', async () => {
      const mockOrderDataCompleted = {
        ...mockOrderData,
        ocrStatus: 'completed',
        extractedText: 'Test prescription text',
        ocrProcessedAt: { toDate: () => new Date() }
      };
      
      const mockDoc = {
        exists: true,
        data: () => mockOrderDataCompleted
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.extractedText).toBe('Test prescription text');
      expect(response.body.message).toBe('OCR already completed for this order');
    });

    it('should return 400 for invalid image URL', async () => {
      mockOcrService.validateImageForOCR.mockReturnValue({
        isValid: false,
        errors: ['Invalid image format']
      });

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid image for OCR');
    });

    it('should handle database errors', async () => {
      const mockOrderRef = {
        get: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        update: vi.fn()
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error during OCR processing');
    });
  });

  describe('GET /orders/:orderId/ocr-status', () => {
    const orderId = 'test-order-456';

    it('should return OCR status for existing order', async () => {
      const mockOrderData = {
        orderId,
        ocrStatus: 'completed',
        extractedText: 'Sample prescription text',
        ocrProcessedAt: { toDate: () => new Date('2025-01-01') }
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .get(`/api/orders/${orderId}/ocr-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(orderId);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.extractedText).toBe('Sample prescription text');
    });

    it('should return 404 for non-existent order', async () => {
      const mockDoc = { exists: false };
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockOrderRef)
      });

      const response = await request(app)
        .get(`/api/orders/${orderId}/ocr-status`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should return pending status for orders without OCR data', async () => {
      const mockOrderData = { orderId };
      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .get(`/api/orders/${orderId}/ocr-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.extractedText).toBeUndefined();
    });

    it('should return failed status with error message', async () => {
      const mockOrderData = {
        orderId,
        ocrStatus: 'failed',
        ocrError: 'Image processing failed',
        ocrProcessedAt: { toDate: () => new Date() }
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc)
      };

      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockOrderRef)
      };

      mockDb.collection.mockReturnValue(mockCollection);

      const response = await request(app)
        .get(`/api/orders/${orderId}/ocr-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.error).toBe('Image processing failed');
    });
  });

  describe('GET /ocr/health', () => {
    it('should return healthy status when service is operational', async () => {
      mockOcrService.healthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/ocr/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.message).toBe('OCR service is operational');
    });

    it('should return unhealthy status when service is down', async () => {
      mockOcrService.healthCheck.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/ocr/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('OCR service is unavailable');
    });

    it('should handle health check errors', async () => {
      mockOcrService.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/ocr/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('OCR service health check failed');
    });
  });

  describe('async OCR processing', () => {
    it('should process OCR and update order on success', async () => {
      // This would be tested in integration tests
      // Here we verify the endpoint behavior, not the async processing
      const orderId = 'async-test-order';
      const mockOrderData = {
        orderId,
        originalImageUrl: 'https://example.com/test.jpg',
        ocrStatus: 'pending'
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrderData
      };
      
      const mockOrderRef = {
        get: vi.fn().mockResolvedValue(mockDoc),
        update: vi.fn()
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockOrderRef)
      });

      mockOcrService.validateImageForOCR.mockReturnValue({
        isValid: true,
        errors: []
      });

      const response = await request(app)
        .post(`/api/orders/${orderId}/process-ocr`)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(mockOrderRef.update).toHaveBeenCalledWith({
        ocrStatus: 'processing',
        updatedAt: expect.any(Object)
      });
    });
  });

  describe('error handling', () => {
    it('should handle malformed request parameters', async () => {
      const response = await request(app)
        .post('/api/orders//process-ocr') // Empty orderId
        .expect(404);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/orders/test/process-ocr')
        .send('invalid json')
        .expect(400);
    });

    it('should handle database connection failures gracefully', async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error('Database unavailable');
      });

      const response = await request(app)
        .post('/api/orders/test/process-ocr')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
}); 