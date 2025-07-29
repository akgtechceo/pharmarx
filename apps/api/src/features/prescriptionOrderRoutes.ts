import { Request, Response, Router } from 'express';
import { PrescriptionOrder, CreatePrescriptionOrderInput, PrescriptionOrderStatus, ApiResponse, OrderHistoryResponse, OrderHistoryItem } from '@pharmarx/shared-types';
import { db } from './database';
import { ocrService } from './ocrService';
import { receiptService } from './receiptService';
import admin from 'firebase-admin';

const router = Router();

/**
 * POST /orders - Create a new prescription order
 * Automatically triggers OCR processing if image URL is provided
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const orderData: CreatePrescriptionOrderInput = req.body;

    // Validate required fields
    if (!orderData.patientProfileId) {
      return res.status(400).json({
        success: false,
        error: 'Patient profile ID is required'
      } as ApiResponse<null>);
    }

    if (!orderData.originalImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Original image URL is required'
      } as ApiResponse<null>);
    }

    // Validate image URL for OCR processing
    const validation = ocrService.validateImageForOCR(orderData.originalImageUrl);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid image for OCR: ${validation.errors.join(', ')}`
      } as ApiResponse<null>);
    }

    // Generate order ID
    const orderId = db.collection('prescriptionOrders').doc().id;
    const now = new Date();

    // Create prescription order with OCR fields
    const prescriptionOrder: PrescriptionOrder = {
      orderId,
      patientProfileId: orderData.patientProfileId,
      status: orderData.status || 'pending_verification',
      originalImageUrl: orderData.originalImageUrl,
      // OCR fields initialized
      ocrStatus: 'pending',
      createdAt: now,
      updatedAt: now
    };

    // Save order to database
    await db.collection('prescriptionOrders').doc(orderId).set({
      ...prescriptionOrder,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now)
    });

    console.log(`Created prescription order: ${orderId}`);

    // Trigger OCR processing asynchronously
    triggerOCRProcessing(orderId, orderData.originalImageUrl);

    // Return created order
    res.status(201).json({
      success: true,
      data: prescriptionOrder,
      message: 'Prescription order created successfully. OCR processing initiated.'
    } as ApiResponse<PrescriptionOrder>);

  } catch (error) {
    console.error('Error creating prescription order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during order creation'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders - Get prescription orders for a patient
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      } as ApiResponse<null>);
    }

    console.log(`Fetching orders for patient: ${patientId}`);

    // Query orders for the patient
    const ordersSnapshot = await db
      .collection('prescriptionOrders')
      .where('patientProfileId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders: PrescriptionOrder[] = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        ocrProcessedAt: data.ocrProcessedAt?.toDate()
      } as PrescriptionOrder;
    });

    res.status(200).json({
      success: true,
      data: orders
    } as ApiResponse<PrescriptionOrder[]>);

  } catch (error) {
    console.error('Error fetching prescription orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching orders'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId - Get a specific prescription order
 */
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    console.log(`Fetching order: ${orderId}`);

    const orderDoc = await db.collection('prescriptionOrders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    const data = orderDoc.data();
    const order: PrescriptionOrder = {
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      ocrProcessedAt: data?.ocrProcessedAt?.toDate()
    } as PrescriptionOrder;

    res.status(200).json({
      success: true,
      data: order
    } as ApiResponse<PrescriptionOrder>);

  } catch (error) {
    console.error('Error fetching prescription order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching order'
    } as ApiResponse<null>);
  }
});

/**
 * PUT /orders/:orderId/status - Update prescription order status
 */
router.put('/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status }: { status: PrescriptionOrderStatus } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      } as ApiResponse<null>);
    }

    // Validate status
    const validStatuses: PrescriptionOrderStatus[] = [
      'pending_verification',
      'awaiting_payment',
      'preparing',
      'out_for_delivery',
      'delivered',
      'rejected'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      } as ApiResponse<null>);
    }

    console.log(`Updating order ${orderId} status to: ${status}`);

    // Check if order exists
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    // Update order status
    await orderRef.update({
      status,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    // Fetch updated order
    const updatedDoc = await orderRef.get();
    const data = updatedDoc.data();
    const updatedOrder: PrescriptionOrder = {
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      ocrProcessedAt: data?.ocrProcessedAt?.toDate()
    } as PrescriptionOrder;

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    } as ApiResponse<PrescriptionOrder>);

  } catch (error) {
    console.error('Error updating prescription order status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating order status'
    } as ApiResponse<null>);
  }
});

/**
 * PUT /orders/:orderId/manual-text - Manually enter text as fallback when OCR fails
 */
router.put('/orders/:orderId/manual-text', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { extractedText }: { extractedText: string } = req.body;

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Extracted text is required'
      } as ApiResponse<null>);
    }

    console.log(`Manual text entry for order: ${orderId}`);

    // Check if order exists
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    const orderData = orderDoc.data();
    
    // Allow manual entry only if OCR failed or is pending
    if (orderData?.ocrStatus === 'completed') {
      return res.status(409).json({
        success: false,
        error: 'OCR has already completed successfully. Manual text entry not needed.',
        data: {
          currentText: orderData.extractedText,
          ocrStatus: orderData.ocrStatus
        }
      } as ApiResponse<null>);
    }

    // Update order with manually entered text
    await orderRef.update({
      extractedText: extractedText.trim(),
      ocrStatus: 'completed',
      ocrProcessedAt: admin.firestore.Timestamp.fromDate(new Date()),
      ocrError: orderData?.ocrStatus === 'failed' ? `OCR failed, manually entered by user` : null,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    // Fetch updated order
    const updatedDoc = await orderRef.get();
    const data = updatedDoc.data();
    const updatedOrder: PrescriptionOrder = {
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      ocrProcessedAt: data?.ocrProcessedAt?.toDate()
    } as PrescriptionOrder;

    console.log(`Manual text entry completed for order: ${orderId}`);

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Manual text entry completed successfully'
    } as ApiResponse<PrescriptionOrder>);

  } catch (error) {
    console.error('Error during manual text entry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during manual text entry'
    } as ApiResponse<null>);
  }
});

/**
 * Async function to trigger OCR processing for new orders
 */
async function triggerOCRProcessing(orderId: string, imageUrl: string): Promise<void> {
  try {
    console.log(`Triggering OCR processing for new order: ${orderId}`);
    
    // Update order status to processing
    const orderRef = db.collection('prescriptionOrders').doc(orderId);
    await orderRef.update({
      ocrStatus: 'processing',
      updatedAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    // Use shared OCR processing logic with Firestore timestamp support
    const ocrRequest = { orderId, imageUrl };
    await ocrService.processImageAndUpdateOrder(ocrRequest, orderRef, true);
    
  } catch (error) {
    console.error(`Unexpected error during OCR processing setup for new order: ${orderId}`, error);
  }
}

/**
 * GET /orders/history - Get user's order history with pagination
 */
router.get('/orders/history', async (req: Request, res: Response) => {
  try {
    const { patientId, page = '1', limit = '10' } = req.query;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      } as ApiResponse<null>);
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50 per page
    const offset = (pageNum - 1) * limitNum;

    console.log(`Fetching order history for patient: ${patientId}, page: ${pageNum}, limit: ${limitNum}`);

    // Get total count
    const countSnapshot = await db
      .collection('prescriptionOrders')
      .where('patientProfileId', '==', patientId)
      .count()
      .get();

    const total = countSnapshot.data().count;

    // Query orders with pagination
    const ordersSnapshot = await db
      .collection('prescriptionOrders')
      .where('patientProfileId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset(offset)
      .get();

    // Get payment information for receipt availability
    const orderIds = ordersSnapshot.docs.map(doc => doc.id);
    const paymentsSnapshot = await db
      .collection('payments')
      .where('orderId', 'in', orderIds)
      .get();

    const paymentsMap = new Map();
    paymentsSnapshot.docs.forEach(doc => {
      const payment = doc.data();
      paymentsMap.set(payment.orderId, payment);
    });

    const orders: OrderHistoryItem[] = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      const payment = paymentsMap.get(doc.id);
      
      return {
        orderId: doc.id,
        status: data.status,
        medicationDetails: data.medicationDetails,
        cost: data.cost || payment?.amount,
        createdAt: data.createdAt?.toDate() || new Date(),
        deliveredAt: data.status === 'delivered' ? data.updatedAt?.toDate() : undefined,
        hasReceipt: !!payment?.receiptId
      };
    });

    const response: OrderHistoryResponse = {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: offset + limitNum < total
      }
    };

    res.status(200).json({
      success: true,
      data: response
    } as ApiResponse<OrderHistoryResponse>);

  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching order history'
    } as ApiResponse<null>);
  }
});

/**
 * GET /orders/:orderId/receipt - Download receipt for a completed order
 */
router.get('/orders/:orderId/receipt', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { patientId } = req.query;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      } as ApiResponse<null>);
    }

    console.log(`Generating receipt for order: ${orderId}`);

    // Verify order exists and belongs to patient
    const orderDoc = await db.collection('prescriptionOrders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      } as ApiResponse<null>);
    }

    const orderData = orderDoc.data();
    if (orderData?.patientProfileId !== patientId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Order does not belong to patient'
      } as ApiResponse<null>);
    }

    // Check if order is completed
    if (orderData?.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Receipt can only be generated for delivered orders'
      } as ApiResponse<null>);
    }

    // Get payment for this order
    const paymentsSnapshot = await db
      .collection('payments')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (paymentsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found for this order'
      } as ApiResponse<null>);
    }

    const payment = paymentsSnapshot.docs[0].data();

    // Check if receipt already exists
    if (payment.receiptId) {
      const existingReceipt = await receiptService.getReceipt(payment.receiptId);
      if (existingReceipt) {
        const pdfBuffer = await receiptService.getReceiptPDF(payment.receiptId);
        if (pdfBuffer) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="receipt-${orderId}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          return res.send(pdfBuffer);
        }
      }
    }

    // Generate new receipt
    const pharmacyInfo = {
      name: 'PharmaRx Benin',
      address: '123 Avenue de la Santé, Cotonou, Bénin',
      phone: '+229 21 30 12 34',
      email: 'contact@pharmarx-benin.bj',
      licenseNumber: 'PHAR-2024-001',
      taxId: 'NIF-2024-001'
    };

    const receiptResult = await receiptService.generateReceiptForPayment(
      payment.paymentId,
      pharmacyInfo
    );

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${orderId}.pdf"`);
    res.setHeader('Content-Length', receiptResult.pdfBuffer.length.toString());

    res.send(receiptResult.pdfBuffer);

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while generating receipt'
    } as ApiResponse<null>);
  }
});

export { router as prescriptionOrderRoutes }; 