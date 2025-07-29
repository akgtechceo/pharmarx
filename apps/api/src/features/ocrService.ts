import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OCRProcessingRequest, OCRProcessingResult, OCRStatus } from '@pharmarx/shared-types';
import { loadOCRConfig, validateOCRConfig, OCRConfig } from '../config/gcpConfig';

export class OCRService {
  private client: ImageAnnotatorClient;
  private config: OCRConfig;

  constructor() {
    // Load and validate configuration
    this.config = loadOCRConfig();
    const validation = validateOCRConfig(this.config);
    
    if (!validation.isValid) {
      console.error('OCR configuration validation failed:', validation.errors);
      throw new Error(`OCR configuration invalid: ${validation.errors.join(', ')}`);
    }

    // Initialize Google Cloud Vision client with configuration
    this.client = new ImageAnnotatorClient(this.config.gcpConfig);
    console.log('OCR Service initialized successfully');
  }

  /**
   * Process OCR for a prescription image
   */
  async processImage(request: OCRProcessingRequest): Promise<OCRProcessingResult> {
    const { orderId, imageUrl } = request;
    
    try {
      console.log(`Starting OCR processing for order ${orderId}`);
      
      // Perform text detection with retry logic
      const extractionResult = await this.extractTextWithRetry(imageUrl);
      
      const result: OCRProcessingResult = {
        success: true,
        extractedText: extractionResult.text,
        confidence: extractionResult.confidence,
        processedAt: new Date()
      };

      console.log(`OCR processing completed successfully for order ${orderId} with confidence ${result.confidence}`);
      return result;

    } catch (error) {
      console.error(`OCR processing failed for order ${orderId}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR processing error',
        processedAt: new Date()
      };
    }
  }

  /**
   * Extract text from image with retry logic
   */
  private async extractTextWithRetry(imageUrl: string): Promise<{ text: string; confidence: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`OCR attempt ${attempt}/${this.config.maxRetries} for image: ${imageUrl}`);
        
        // Call Google Cloud Vision API
        const [result] = await this.client.textDetection({
          image: { source: { imageUri: imageUrl } }
        });

        // Extract text from response
        const detections = result.textAnnotations;
        if (!detections || detections.length === 0) {
          throw new Error('No text detected in the image');
        }

        // The first annotation contains the full extracted text
        const extractedText = detections[0].description || '';
        
        if (!extractedText.trim()) {
          throw new Error('Empty text extracted from image');
        }

        // Calculate confidence from individual word detections
        const confidence = this.calculateOverallConfidence(detections);

        console.log(`Successfully extracted ${extractedText.length} characters of text with confidence ${confidence}`);
        return { text: extractedText, confidence };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`OCR attempt ${attempt} failed:`, lastError.message);

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    throw new Error(`OCR failed after ${this.config.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Calculate overall confidence from text annotations
   */
  private calculateOverallConfidence(detections: any[]): number {
    if (!detections || detections.length <= 1) {
      return 0.85; // Default confidence when no individual word confidence available
    }

    // Skip the first annotation (full text) and calculate from individual words
    const wordDetections = detections.slice(1);
    let totalConfidence = 0;
    let validDetections = 0;

    for (const detection of wordDetections) {
      if (detection.confidence && typeof detection.confidence === 'number') {
        totalConfidence += detection.confidence;
        validDetections++;
      }
    }

    if (validDetections === 0) {
      return 0.85; // Default confidence
    }

    const averageConfidence = totalConfidence / validDetections;
    return Math.round(averageConfidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate image for OCR processing
   */
  validateImageForOCR(imageUrl: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic URL validation
    if (!imageUrl || !imageUrl.trim()) {
      errors.push('Image URL is required');
      return { isValid: false, errors };
    }

    // Check if URL is accessible (proper URL format check)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:', 'data:'].includes(parsedUrl.protocol)) {
        errors.push('Image URL must use HTTP, HTTPS, or data URI protocol');
      }
    } catch {
      errors.push('Invalid image URL format');
      return { isValid: false, errors };
    }

    // For data URIs, validate format
    if (parsedUrl.protocol === 'data:') {
      const supportedDataTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:application/pdf'];
      const hasValidDataType = supportedDataTypes.some(type => 
        imageUrl.toLowerCase().startsWith(type)
      );
      
      if (!hasValidDataType) {
        errors.push('Data URI must be in JPG, PNG, or PDF format');
      }
    } else {
      // For regular URLs, check file extension
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const hasValidExtension = supportedExtensions.some(ext => 
        parsedUrl.pathname.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        errors.push('Image must be in JPG, PNG, or PDF format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check OCR service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to create a client and perform a simple operation
      await this.client.getProjectId();
      return true;
    } catch (error) {
      console.error('OCR service health check failed:', error);
      return false;
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process OCR and update order in database (shared logic for route handlers)
   */
  async processImageAndUpdateOrder(request: OCRProcessingRequest, orderRef: any, useFirestoreTimestamp = false): Promise<void> {
    const { orderId, imageUrl } = request;
    
    try {
      console.log(`Starting async OCR processing for order: ${orderId}`);
      
      // Process OCR
      const result = await this.processImage(request);
      
      // Helper function to create timestamp in the appropriate format
      const createTimestamp = (date: Date) => {
        if (useFirestoreTimestamp) {
          // Use dynamic import to avoid dependency issues
          const admin = require('firebase-admin');
          return admin.firestore.Timestamp.fromDate(date);
        }
        return date;
      };
      
      // Update order with results
      if (result.success) {
        await orderRef.update({
          ocrStatus: 'completed',
          extractedText: result.extractedText,
          ocrProcessedAt: createTimestamp(result.processedAt),
          ocrError: null, // Clear any previous errors
          updatedAt: createTimestamp(new Date())
        });
        
        console.log(`OCR processing completed successfully for order: ${orderId}`);
      } else {
        await orderRef.update({
          ocrStatus: 'failed',
          ocrError: result.error,
          ocrProcessedAt: createTimestamp(result.processedAt),
          updatedAt: createTimestamp(new Date())
        });
        
        console.error(`OCR processing failed for order: ${orderId}`, result.error);
      }
      
    } catch (error) {
      console.error(`Unexpected error during async OCR processing for order: ${orderId}`, error);
      
      // Update order with error status
      try {
        const createTimestamp = (date: Date) => {
          if (useFirestoreTimestamp) {
            const admin = require('firebase-admin');
            return admin.firestore.Timestamp.fromDate(date);
          }
          return date;
        };

        await orderRef.update({
          ocrStatus: 'failed',
          ocrError: error instanceof Error ? error.message : 'Unknown error during OCR processing',
          ocrProcessedAt: createTimestamp(new Date()),
          updatedAt: createTimestamp(new Date())
        });
      } catch (updateError) {
        console.error(`Failed to update order with error status: ${orderId}`, updateError);
      }
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService(); 