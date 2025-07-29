import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OCRService } from './ocrService';
import { OCRProcessingRequest } from '@pharmarx/shared-types';

// Mock Google Cloud Vision client - hoisted
vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn(() => ({
    textDetection: vi.fn(),
    getProjectId: vi.fn()
  }))
}));

vi.mock('../config/gcpConfig', () => ({
  loadOCRConfig: vi.fn(() => ({
    maxRetries: 3,
    retryDelay: 100,
    gcpConfig: {
      projectId: 'test-project'
    }
  })),
  validateOCRConfig: vi.fn(() => ({
    isValid: true,
    errors: []
  }))
}));

// Integration tests with mocked Google Cloud Vision API responses
describe('OCR Integration Tests', () => {
  let ocrService: OCRService;
  let mockTextDetection: any;
  let mockGetProjectId: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mock functions from the mocked module
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const MockedImageAnnotatorClient = ImageAnnotatorClient as any;
    const instance = new MockedImageAnnotatorClient();
    mockTextDetection = instance.textDetection;
    mockGetProjectId = instance.getProjectId;
    
    // Set up default successful mock for getProjectId
    mockGetProjectId.mockResolvedValue('test-project-id');
    
    ocrService = new OCRService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real-world prescription text extraction', () => {
    it('should extract text from prescription image', async () => {
      // Simulate realistic prescription text from Google Cloud Vision
      const prescriptionText = `Dr. Smith's Medical Practice
123 Medical Center Drive
Anytown, ST 12345

PRESCRIPTION

Patient: John Doe
DOB: 01/15/1980
Date: 01/15/2025

Rx: Amoxicillin 500mg
Sig: Take 1 capsule by mouth three times daily
Qty: 30 capsules
Refills: 2

Dr. Sarah Smith, MD
License: MD123456`;

      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [
          {
            description: prescriptionText,
            boundingPoly: {
              vertices: [
                { x: 10, y: 10 },
                { x: 400, y: 10 },
                { x: 400, y: 600 },
                { x: 10, y: 600 }
              ]
            }
          }
        ]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'prescription-order-123',
        imageUrl: 'https://storage.googleapis.com/prescriptions/prescription-001.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(prescriptionText);
      expect(result.extractedText).toContain('Amoxicillin 500mg');
      expect(result.extractedText).toContain('John Doe');
      expect(result.extractedText).toContain('Dr. Sarah Smith');
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should handle handwritten prescription with lower confidence', async () => {
      const handwrittenText = `Patient: Mary Johnson
Rx: Lisinopril 10mg
Take once daily
#30 tablets
Dr. Johnson`;

      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [
          {
            description: handwrittenText,
            confidence: 0.75 // Lower confidence for handwritten text
          }
        ]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'handwritten-prescription-456',
        imageUrl: 'https://storage.googleapis.com/prescriptions/handwritten-001.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(handwrittenText);
      expect(result.extractedText).toContain('Lisinopril');
    });

    it('should handle poor quality image with partial text', async () => {
      const partialText = `Patient: [UNCLEAR]
Rx: Metformin
Take with meals
Qty: [UNCLEAR]`;

      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [
          {
            description: partialText,
            confidence: 0.45 // Very low confidence
          }
        ]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'poor-quality-789',
        imageUrl: 'https://storage.googleapis.com/prescriptions/poor-quality-001.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(partialText);
      expect(result.extractedText).toContain('[UNCLEAR]');
    });
  });

  describe('Google Cloud Vision API error scenarios', () => {
    it('should handle QUOTA_EXCEEDED error', async () => {
      mockTextDetection.mockRejectedValueOnce({
        code: 8,
        message: 'Quota exceeded for quota group and limit',
        details: 'QUOTA_EXCEEDED'
      });

      const request: OCRProcessingRequest = {
        orderId: 'quota-test',
        imageUrl: 'https://example.com/test.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quota exceeded');
    });

    it('should handle PERMISSION_DENIED error', async () => {
      mockTextDetection.mockRejectedValueOnce({
        code: 7,
        message: 'The caller does not have permission',
        details: 'PERMISSION_DENIED'
      });

      const request: OCRProcessingRequest = {
        orderId: 'permission-test',
        imageUrl: 'https://example.com/test.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should handle INVALID_ARGUMENT for unsupported image format', async () => {
      mockTextDetection.mockRejectedValueOnce({
        code: 3,
        message: 'Invalid image format',
        details: 'INVALID_ARGUMENT'
      });

      const request: OCRProcessingRequest = {
        orderId: 'invalid-format-test',
        imageUrl: 'https://example.com/document.tiff'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image format');
    });

    it('should handle network timeout errors', async () => {
      mockTextDetection.mockRejectedValueOnce({
        code: 4,
        message: 'Deadline exceeded',
        details: 'DEADLINE_EXCEEDED'
      });

      const request: OCRProcessingRequest = {
        orderId: 'timeout-test',
        imageUrl: 'https://example.com/large-image.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Deadline exceeded');
    });
  });

  describe('Retry logic with transient failures', () => {
    it('should succeed after transient network error', async () => {
      const prescriptionText = 'Rx: Aspirin 81mg daily';

      // First call fails with transient error, second succeeds
      mockTextDetection
        .mockRejectedValueOnce({
          code: 14,
          message: 'Service temporarily unavailable',
          details: 'UNAVAILABLE'
        })
        .mockResolvedValueOnce([{
          textAnnotations: [{ description: prescriptionText }]
        }]);

      const request: OCRProcessingRequest = {
        orderId: 'retry-success-test',
        imageUrl: 'https://example.com/prescription.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(prescriptionText);
      expect(mockTextDetection).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries with persistent error', async () => {
      const persistentError = {
        code: 13,
        message: 'Internal server error',
        details: 'INTERNAL'
      };

      mockTextDetection.mockRejectedValue(persistentError);

      const request: OCRProcessingRequest = {
        orderId: 'persistent-error-test',
        imageUrl: 'https://example.com/prescription.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal server error');
      expect(mockTextDetection).toHaveBeenCalledTimes(3); // maxRetries
    });
  });

  describe('Image format handling', () => {
    it('should process JPEG images successfully', async () => {
      const extractedText = 'JPEG prescription text';
      
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: extractedText }]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'jpeg-test',
        imageUrl: 'https://example.com/prescription.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(mockTextDetection).toHaveBeenCalledWith({
        image: { source: { imageUri: request.imageUrl } },
        features: [{ type: 'TEXT_DETECTION' }]
      });
    });

    it('should process PNG images successfully', async () => {
      const extractedText = 'PNG prescription text';
      
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: extractedText }]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'png-test',
        imageUrl: 'https://example.com/prescription.png'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(extractedText);
    });

    it('should process PDF documents successfully', async () => {
      const extractedText = 'PDF prescription content\nPage 1 of 1';
      
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: extractedText }]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'pdf-test',
        imageUrl: 'https://example.com/prescription.pdf'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(extractedText);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large prescription images', async () => {
      // Simulate large prescription with lots of text
      const largeText = Array(100).fill(
        'Prescription line with medication details and instructions'
      ).join('\n');

      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: largeText }]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'large-image-test',
        imageUrl: 'https://example.com/large-prescription.jpg'
      };

      const startTime = Date.now();
      const result = await ocrService.processImage(request);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(largeText);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent OCR requests', async () => {
      const mockTexts = [
        'Prescription 1: Aspirin 81mg',
        'Prescription 2: Metformin 500mg',
        'Prescription 3: Lisinopril 10mg'
      ];

      mockTextDetection
        .mockResolvedValueOnce([{ textAnnotations: [{ description: mockTexts[0] }] }])
        .mockResolvedValueOnce([{ textAnnotations: [{ description: mockTexts[1] }] }])
        .mockResolvedValueOnce([{ textAnnotations: [{ description: mockTexts[2] }] }]);

      const requests: OCRProcessingRequest[] = [
        { orderId: 'concurrent-1', imageUrl: 'https://example.com/rx1.jpg' },
        { orderId: 'concurrent-2', imageUrl: 'https://example.com/rx2.jpg' },
        { orderId: 'concurrent-3', imageUrl: 'https://example.com/rx3.jpg' }
      ];

      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => ocrService.processImage(req)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.extractedText).toBe(mockTexts[index]);
      });
      
      // Concurrent processing should be faster than sequential
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Health check integration', () => {
    it('should verify service connectivity', async () => {
      mockGetProjectId.mockResolvedValueOnce('test-project-123');

      const isHealthy = await ocrService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockGetProjectId).toHaveBeenCalled();
    });

    it('should detect service unavailability', async () => {
      mockGetProjectId.mockRejectedValueOnce(new Error('Service unavailable'));

      const isHealthy = await ocrService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle images with no text', async () => {
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: []
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'no-text-test',
        imageUrl: 'https://example.com/blank-image.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No text detected');
    });

    it('should handle corrupted image responses', async () => {
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: null }]
      }]);

      const request: OCRProcessingRequest = {
        orderId: 'corrupted-test',
        imageUrl: 'https://example.com/corrupted.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty text extracted');
    });

    it('should handle malformed API responses', async () => {
      mockTextDetection.mockResolvedValueOnce([null]);

      const request: OCRProcessingRequest = {
        orderId: 'malformed-test',
        imageUrl: 'https://example.com/test.jpg'
      };

      const result = await ocrService.processImage(request);

      expect(result.success).toBe(false);
    });
  });
}); 