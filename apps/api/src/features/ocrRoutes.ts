import { Request, Response, Router } from 'express';
import { ocrService } from './ocrService';
import { OCRProcessingRequest, OCRStatusResponse, ApiResponse } from '@pharmarx/shared-types';
import { db } from './database';

const router = Router();

/**
 * POST /orders/:orderId/process-ocr
 * Trigger OCR processing for an uploaded prescription
 */
router.post('/orders/:orderId/process-ocr', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    console.log(`Received OCR processing request for order: ${orderId}`);

    // Validate order exists and get image URL
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    const orderData = orderDoc.data();
    if (!orderData?.originalImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'No image URL found for this order'
      } as ApiResponse<null>);
    }

    // Check if OCR is already in progress or completed
    if (orderData.ocrStatus === 'processing') {
      return res.status(409).json({
        success: false,
        error: 'OCR processing already in progress for this order'
      } as ApiResponse<null>);
    }

    if (orderData.ocrStatus === 'completed') {
      return res.status(200).json({
        success: true,
        data: {
          orderId,
          status: 'completed',
          extractedText: orderData.extractedText,
          processedAt: orderData.ocrProcessedAt?.toDate()
        } as OCRStatusResponse,
        message: 'OCR already completed for this order'
      } as ApiResponse<OCRStatusResponse>);
    }

    // Validate image URL
    const validation = ocrService.validateImageForOCR(orderData.originalImageUrl);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid image for OCR: ${validation.errors.join(', ')}`
      } as ApiResponse<null>);
    }

    // Update order status to processing
    await orderRef.update({
      ocrStatus: 'processing',
      updatedAt: new Date()
    });

    // Process OCR asynchronously (don't await to avoid blocking)
    const ocrRequest: OCRProcessingRequest = {
      orderId,
      imageUrl: orderData.originalImageUrl
    };

    processOCRAsync(ocrRequest);

    // Return immediately with processing status
    res.status(202).json({
      success: true,
      data: {
        orderId,
        status: 'processing',
        processedAt: new Date()
      } as OCRStatusResponse,
      message: 'OCR processing started'
    } as ApiResponse<OCRStatusResponse>);

  } catch (error) {
    console.error('Error processing OCR request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during OCR processing'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId/ocr-status
 * Check OCR processing status for an order
 */
router.get('/orders/:orderId/ocr-status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    console.log(`Checking OCR status for order: ${orderId}`);

    // Get order data
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    const orderData = orderDoc.data();
    const response: OCRStatusResponse = {
      orderId,
      status: orderData?.ocrStatus || 'pending',
      extractedText: orderData?.extractedText,
      error: orderData?.ocrError,
      processedAt: orderData?.ocrProcessedAt?.toDate()
    };

    res.status(200).json({
      success: true,
      data: response
    } as ApiResponse<OCRStatusResponse>);

  } catch (error) {
    console.error('Error checking OCR status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while checking OCR status'
    } as ApiResponse<null>);
  }
});

/**
 * GET /ocr/health
 * Check OCR service health
 */
router.get('/ocr/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await ocrService.healthCheck();
    
    if (isHealthy) {
      res.status(200).json({
        success: true,
        data: { status: 'healthy' },
        message: 'OCR service is operational'
      } as ApiResponse<{ status: string }>);
    } else {
      res.status(503).json({
        success: false,
        error: 'OCR service is unavailable'
      } as ApiResponse<null>);
    }
  } catch (error) {
    console.error('Error checking OCR health:', error);
    res.status(503).json({
      success: false,
      error: 'OCR service health check failed'
    } as ApiResponse<null>);
  }
});

/**
 * Async function to process OCR without blocking the API response
 */
async function processOCRAsync(request: OCRProcessingRequest): Promise<void> {
  const { orderId } = request;
  
  try {
    // Use shared OCR processing logic
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    await ocrService.processImageAndUpdateOrder(request, orderRef);
    
  } catch (error) {
    console.error(`Unexpected error during async OCR processing setup for order: ${orderId}`, error);
  }
}

export { router as ocrRoutes }; 