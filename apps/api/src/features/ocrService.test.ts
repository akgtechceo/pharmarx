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

// Mock configuration
vi.mock('../config/gcpConfig', () => ({
  loadOCRConfig: vi.fn(() => ({
    maxRetries: 3,
    retryDelay: 100, // Reduced for testing
    gcpConfig: {
      projectId: 'test-project'
    }
  })),
  validateOCRConfig: vi.fn(() => ({
    isValid: true,
    errors: []
  }))
}));

describe('OCRService', () => {
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

  describe('processImage', () => {
    const mockRequest: OCRProcessingRequest = {
      orderId: 'test-order-123',
      imageUrl: 'https://example.com/test-image.jpg'
    };

    it('should successfully extract text from image', async () => {
      const mockExtractedText = 'Prescription: Amoxicillin 500mg\nTake twice daily\nPatient: John Doe';
      
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [
          { description: mockExtractedText }
        ]
      }]);

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(mockExtractedText);
      expect(result.error).toBeUndefined();
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(mockTextDetection).toHaveBeenCalledWith({
        image: { source: { imageUri: mockRequest.imageUrl } }
      });
    });

    it('should handle empty text detection results', async () => {
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: []
      }]);

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OCR failed after 3 attempts. Last error: No text detected in the image');
      expect(result.extractedText).toBeUndefined();
    });

    it('should handle empty extracted text', async () => {
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [
          { description: '' }
        ]
      }]);

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OCR failed after 3 attempts. Last error: Empty text extracted from image');
    });

    it('should retry on transient failures', async () => {
      const mockExtractedText = 'Retry success text';
      
      // First call fails, second succeeds
      mockTextDetection
        .mockRejectedValueOnce(new Error('Transient network error'))
        .mockResolvedValueOnce([{
          textAnnotations: [
            { description: mockExtractedText }
          ]
        }]);

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(mockExtractedText);
      expect(mockTextDetection).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent API error');
      mockTextDetection.mockRejectedValue(error);

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OCR failed after 3 attempts. Last error: Persistent API error');
      expect(mockTextDetection).toHaveBeenCalledTimes(3);
    });

    it('should handle Vision API errors gracefully', async () => {
      mockTextDetection.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));

      const result = await ocrService.processImage(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('QUOTA_EXCEEDED');
    });
  });

  describe('validateImageForOCR', () => {
    it('should validate correct image URLs', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://storage.googleapis.com/bucket/image.png',
        'http://localhost:3000/test.pdf'
      ];

      validUrls.forEach(url => {
        const result = ocrService.validateImageForOCR(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or invalid URLs', () => {
      const invalidUrls = [
        '',
        '   ',
        'not-a-url',
        'ftp://example.com/image.jpg',
        'file:///local/path/image.jpg'
      ];

      invalidUrls.forEach(url => {
        const result = ocrService.validateImageForOCR(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject unsupported file types', () => {
      const unsupportedUrls = [
        'https://example.com/document.txt',
        'https://example.com/video.mp4',
        'https://example.com/audio.wav'
      ];

      unsupportedUrls.forEach(url => {
        const result = ocrService.validateImageForOCR(url);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Image must be in JPG, PNG, or PDF format');
      });
    });

    it('should accept supported file types', () => {
      const supportedUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/document.pdf'
      ];

      supportedUrls.forEach(url => {
        const result = ocrService.validateImageForOCR(url);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockGetProjectId.mockResolvedValueOnce('test-project-id');

      const result = await ocrService.healthCheck();

      expect(result).toBe(true);
      expect(mockGetProjectId).toHaveBeenCalled();
    });

    it('should return false when service is unhealthy', async () => {
      mockGetProjectId.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await ocrService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error scenarios', () => {
    it('should handle malformed Vision API responses', async () => {
      mockTextDetection.mockResolvedValueOnce([{}]); // Missing textAnnotations

      const result = await ocrService.processImage({
        orderId: 'test-order',
        imageUrl: 'https://example.com/image.jpg'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No text detected in the image');
    });

    it('should handle null/undefined responses', async () => {
      mockTextDetection.mockResolvedValueOnce([null]);

      const result = await ocrService.processImage({
        orderId: 'test-order',
        imageUrl: 'https://example.com/image.jpg'
      });

      expect(result.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      mockTextDetection.mockRejectedValueOnce(new Error('TIMEOUT'));

      const result = await ocrService.processImage({
        orderId: 'test-order',
        imageUrl: 'https://example.com/image.jpg'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TIMEOUT');
    });
  });

  describe('performance considerations', () => {
    it('should process image within reasonable time', async () => {
      const mockText = 'Fast processing test';
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: mockText }]
      }]);

      const startTime = Date.now();
      const result = await ocrService.processImage({
        orderId: 'perf-test',
        imageUrl: 'https://example.com/image.jpg'
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should finish within 5 seconds
    });

    it('should handle large text extraction', async () => {
      const largeText = 'A'.repeat(10000); // 10KB of text
      mockTextDetection.mockResolvedValueOnce([{
        textAnnotations: [{ description: largeText }]
      }]);

      const result = await ocrService.processImage({
        orderId: 'large-text-test',
        imageUrl: 'https://example.com/large-image.jpg'
      });

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(largeText);
    });
  });
}); 