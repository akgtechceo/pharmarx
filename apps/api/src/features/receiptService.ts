import { Payment, PaymentGateway, PrescriptionOrder } from '@pharmarx/shared-types';
import { db } from './database';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface BeninReceiptDetails {
  receiptNumber: string;
  issueDate: Date;
  taxRate: number; // TVA rate (usually 18% in Benin)
  taxAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  companyTaxId: string;
  customerTaxId?: string;
  currency: 'XOF' | 'USD';
  exchangeRate?: number; // If paid in USD, conversion rate to XOF
  legalText: {
    french: string;
    english?: string;
  };
  pharmacyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    licenseNumber: string;
    taxId: string;
  };
  medicationDetails: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    prescription: boolean;
  }[];
}

export interface ReceiptGenerationRequest {
  payment: Payment;
  order: PrescriptionOrder;
  pharmacyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    licenseNumber: string;
    taxId: string;
  };
  customerInfo?: {
    name: string;
    address?: string;
    taxId?: string;
  };
}

export interface ReceiptGenerationResult {
  receiptId: string;
  receiptNumber: string;
  pdfBuffer: Buffer;
  receiptDetails: BeninReceiptDetails;
}

class ReceiptService {
  private readonly receiptsCollection = db.collection('receipts');
  private readonly paymentsCollection = db.collection('payments');
  
  // Tax rate for Benin (TVA - Taxe sur la Valeur Ajoutée)
  private readonly BENIN_TAX_RATE = 0.18; // 18%
  
  // Exchange rate cache (in real implementation, this would be fetched from a service)
  private readonly USD_TO_XOF_RATE = 600; // Approximate rate, should be fetched from API

  /**
   * Generate compliant receipt for Benin market
   */
  async generateReceipt(request: ReceiptGenerationRequest): Promise<ReceiptGenerationResult> {
    // Generate receipt number (sequential format: BJ-YYYY-NNNNNN)
    const receiptNumber = await this.generateReceiptNumber();
    
    // Calculate tax details
    const taxDetails = this.calculateTaxDetails(request.payment.amount, request.payment.currency);
    
    // Create receipt details following Benin standards
    const receiptDetails: BeninReceiptDetails = {
      receiptNumber,
      issueDate: new Date(),
      taxRate: this.BENIN_TAX_RATE,
      taxAmount: taxDetails.taxAmount,
      subtotalAmount: taxDetails.subtotalAmount,
      totalAmount: taxDetails.totalAmount,
      companyTaxId: request.pharmacyInfo.taxId,
      customerTaxId: request.customerInfo?.taxId,
      currency: request.payment.currency === 'USD' ? 'USD' : 'XOF',
      exchangeRate: request.payment.currency === 'USD' ? this.USD_TO_XOF_RATE : undefined,
      legalText: {
        french: this.getBeninLegalText(),
        english: this.getBeninLegalTextEnglish()
      },
      pharmacyInfo: request.pharmacyInfo,
      medicationDetails: this.extractMedicationDetails(request.order, taxDetails.unitPrice)
    };

    // Generate PDF receipt
    const pdfBuffer = await this.generatePDF(receiptDetails, request);

    // Store receipt in database
    const receiptId = this.receiptsCollection.doc().id;
    await this.receiptsCollection.doc(receiptId).set({
      receiptId,
      receiptNumber,
      paymentId: request.payment.paymentId,
      orderId: request.payment.orderId,
      receiptDetails,
      pdfStoragePath: `receipts/${receiptId}.pdf`,
      createdAt: new Date(),
      gateway: request.payment.gateway
    });

    // Update payment record with receipt details
    await this.paymentsCollection.doc(request.payment.paymentId).update({
      receiptDetails,
      receiptId,
      receiptNumber,
      updatedAt: new Date()
    });

    return {
      receiptId,
      receiptNumber,
      pdfBuffer,
      receiptDetails
    };
  }

  /**
   * Generate sequential receipt number
   */
  private async generateReceiptNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `BJ-${currentYear}-`;
    
    // Get the last receipt number for this year
    const lastReceiptQuery = await this.receiptsCollection
      .where('receiptNumber', '>=', prefix)
      .where('receiptNumber', '<', `BJ-${currentYear + 1}-`)
      .orderBy('receiptNumber', 'desc')
      .limit(1)
      .get();

    let nextNumber = 1;
    if (!lastReceiptQuery.empty) {
      const lastReceiptNumber = lastReceiptQuery.docs[0].data().receiptNumber;
      const lastNumber = parseInt(lastReceiptNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Calculate tax details according to Benin tax regulations
   */
  private calculateTaxDetails(amount: number, currency: string): {
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    unitPrice: number;
  } {
    // Convert to XOF if needed for tax calculation
    const amountInXOF = currency === 'USD' ? amount * this.USD_TO_XOF_RATE : amount;
    
    // In Benin, the displayed price usually includes tax (TTC - Toutes Taxes Comprises)
    // So we need to extract the tax from the total
    const totalAmount = amountInXOF;
    const subtotalAmount = totalAmount / (1 + this.BENIN_TAX_RATE);
    const taxAmount = totalAmount - subtotalAmount;
    
    return {
      subtotalAmount: Math.round(subtotalAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      unitPrice: Math.round(subtotalAmount * 100) / 100 // For single medication orders
    };
  }

  /**
   * Extract medication details from order
   */
  private extractMedicationDetails(order: PrescriptionOrder, unitPrice: number): BeninReceiptDetails['medicationDetails'] {
    if (order.medicationDetails) {
      return [{
        name: order.medicationDetails.name,
        quantity: order.medicationDetails.quantity,
        unitPrice: unitPrice / order.medicationDetails.quantity,
        totalPrice: unitPrice,
        prescription: true
      }];
    }

    // Fallback for orders without detailed medication info
    return [{
      name: 'Médicament sur ordonnance / Prescription medication',
      quantity: 1,
      unitPrice: unitPrice,
      totalPrice: unitPrice,
      prescription: true
    }];
  }

  /**
   * Get Benin legal text in French
   */
  private getBeninLegalText(): string {
    return `Facture normalisée conforme aux dispositions du Code Général des Impôts du Bénin. 
TVA comprise au taux de ${(this.BENIN_TAX_RATE * 100).toFixed(0)}%. 
Pharmacie agréée par l'Ordre National des Pharmaciens du Bénin. 
Médicaments délivrés sur présentation d'une ordonnance médicale valide. 
Conservation : tenir hors de portée des enfants, dans un endroit sec et frais. 
En cas d'effet indésirable, consulter immédiatement un professionnel de santé.`;
  }

  /**
   * Get Benin legal text in English
   */
  private getBeninLegalTextEnglish(): string {
    return `Standardized invoice compliant with Benin General Tax Code provisions. 
VAT included at ${(this.BENIN_TAX_RATE * 100).toFixed(0)}% rate. 
Pharmacy licensed by the National Order of Pharmacists of Benin. 
Medications dispensed upon presentation of valid medical prescription. 
Storage: keep out of reach of children, in a dry and cool place. 
In case of adverse effects, consult a healthcare professional immediately.`;
  }

  /**
   * Generate PDF receipt
   */
  private async generatePDF(
    receiptDetails: BeninReceiptDetails, 
    request: ReceiptGenerationRequest
  ): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    // Collect PDF data
    doc.on('data', (buffer) => buffers.push(buffer));

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.on('error', reject);

      try {
        // Header - Company Information
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text(receiptDetails.pharmacyInfo.name, { align: 'center' });
        
        doc.fontSize(10).font('Helvetica');
        doc.text(receiptDetails.pharmacyInfo.address, { align: 'center' });
        doc.text(`Tél: ${receiptDetails.pharmacyInfo.phone} | Email: ${receiptDetails.pharmacyInfo.email}`, { align: 'center' });
        doc.text(`Licence N°: ${receiptDetails.pharmacyInfo.licenseNumber} | NIF: ${receiptDetails.pharmacyInfo.taxId}`, { align: 'center' });

        doc.moveDown(2);

        // Receipt Title
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('FACTURE NORMALISÉE / STANDARDIZED INVOICE', { align: 'center' });
        
        doc.moveDown(1);

        // Receipt Details
        doc.fontSize(10).font('Helvetica');
        const startY = doc.y;
        
        // Left side - Receipt info
        doc.text(`N° Facture / Invoice No: ${receiptDetails.receiptNumber}`, 50, startY);
        doc.text(`Date: ${receiptDetails.issueDate.toLocaleDateString('fr-FR')}`, 50, startY + 15);
        doc.text(`Heure / Time: ${receiptDetails.issueDate.toLocaleTimeString('fr-FR')}`, 50, startY + 30);
        
        // Right side - Payment info
        doc.text(`Mode de paiement / Payment method:`, 300, startY);
        doc.text(this.getPaymentMethodText(request.payment.gateway), 300, startY + 15);
        doc.text(`Transaction ID: ${request.payment.transactionId}`, 300, startY + 30);

        doc.moveDown(3);

        // Customer Information (if available)
        if (request.customerInfo) {
          doc.fontSize(12).font('Helvetica-Bold');
          doc.text('INFORMATIONS CLIENT / CUSTOMER INFORMATION');
          doc.fontSize(10).font('Helvetica');
          doc.text(`Nom / Name: ${request.customerInfo.name}`);
          if (request.customerInfo.address) {
            doc.text(`Adresse / Address: ${request.customerInfo.address}`);
          }
          if (request.customerInfo.taxId) {
            doc.text(`NIF Client / Customer Tax ID: ${request.customerInfo.taxId}`);
          }
          doc.moveDown(1);
        }

        // Medication Details Table
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('DÉTAILS DE LA PRESCRIPTION / PRESCRIPTION DETAILS');
        doc.moveDown(0.5);

        // Table headers
        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Médicament / Medication', 50, tableTop);
        doc.text('Qté', 300, tableTop, { width: 40, align: 'center' });
        doc.text('Prix Unit. / Unit Price', 350, tableTop, { width: 80, align: 'right' });
        doc.text('Total', 440, tableTop, { width: 80, align: 'right' });

        // Table line
        doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();

        // Table content
        let currentY = tableTop + 20;
        doc.fontSize(8).font('Helvetica');
        
        receiptDetails.medicationDetails.forEach((item) => {
          doc.text(item.name, 50, currentY, { width: 240 });
          doc.text(item.quantity.toString(), 300, currentY, { width: 40, align: 'center' });
          doc.text(`${this.formatCurrency(item.unitPrice, receiptDetails.currency)}`, 350, currentY, { width: 80, align: 'right' });
          doc.text(`${this.formatCurrency(item.totalPrice, receiptDetails.currency)}`, 440, currentY, { width: 80, align: 'right' });
          currentY += 15;
        });

        // Totals
        doc.moveTo(300, currentY).lineTo(520, currentY).stroke();
        currentY += 10;

        doc.fontSize(9).font('Helvetica');
        doc.text('Sous-total HT / Subtotal:', 350, currentY, { width: 80, align: 'right' });
        doc.text(`${this.formatCurrency(receiptDetails.subtotalAmount, receiptDetails.currency)}`, 440, currentY, { width: 80, align: 'right' });
        currentY += 15;

        doc.text(`TVA ${(receiptDetails.taxRate * 100).toFixed(0)}% / VAT:`, 350, currentY, { width: 80, align: 'right' });
        doc.text(`${this.formatCurrency(receiptDetails.taxAmount, receiptDetails.currency)}`, 440, currentY, { width: 80, align: 'right' });
        currentY += 15;

        doc.font('Helvetica-Bold');
        doc.text('TOTAL TTC / TOTAL INCL. TAX:', 350, currentY, { width: 80, align: 'right' });
        doc.text(`${this.formatCurrency(receiptDetails.totalAmount, receiptDetails.currency)}`, 440, currentY, { width: 80, align: 'right' });

        // Exchange rate info if applicable
        if (receiptDetails.exchangeRate) {
          currentY += 20;
          doc.fontSize(8).font('Helvetica');
          doc.text(`Taux de change / Exchange rate: 1 USD = ${receiptDetails.exchangeRate} XOF`, 350, currentY, { width: 170, align: 'right' });
          doc.text(`Équivalent XOF: ${this.formatCurrency(receiptDetails.totalAmount * receiptDetails.exchangeRate, 'XOF')}`, 350, currentY + 10, { width: 170, align: 'right' });
        }

        doc.moveDown(2);

        // Legal text
        doc.fontSize(7).font('Helvetica');
        doc.text('MENTIONS LÉGALES / LEGAL INFORMATION:', { underline: true });
        doc.moveDown(0.5);
        doc.text(receiptDetails.legalText.french, { width: 520, align: 'justify' });
        doc.moveDown(0.5);
        doc.text(receiptDetails.legalText.english, { width: 520, align: 'justify' });

        // Footer
        doc.moveDown(1);
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Merci de votre confiance / Thank you for your trust', { align: 'center' });
        doc.fontSize(7).font('Helvetica');
        doc.text(`Facture générée électroniquement le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number, currency: string): string {
    if (currency === 'XOF') {
      return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Get payment method text for receipt
   */
  private getPaymentMethodText(gateway: PaymentGateway): string {
    switch (gateway) {
      case 'stripe':
        return 'Carte bancaire / Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'mtn':
        return 'MTN Mobile Money';
      default:
        return 'Paiement électronique / Electronic Payment';
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<any | null> {
    const doc = await this.receiptsCollection.doc(receiptId).get();
    return doc.exists ? doc.data() : null;
  }

  /**
   * Get receipt by payment ID
   */
  async getReceiptByPaymentId(paymentId: string): Promise<any | null> {
    const snapshot = await this.receiptsCollection
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  /**
   * Generate receipt for existing payment
   */
  async generateReceiptForPayment(
    paymentId: string,
    pharmacyInfo: ReceiptGenerationRequest['pharmacyInfo'],
    customerInfo?: ReceiptGenerationRequest['customerInfo']
  ): Promise<ReceiptGenerationResult> {
    // Get payment details
    const paymentDoc = await this.paymentsCollection.doc(paymentId).get();
    if (!paymentDoc.exists) {
      throw new Error('Payment not found');
    }

    const payment = paymentDoc.data() as Payment;

    // Get order details
    const orderDoc = await db.collection('prescriptionOrders').doc(payment.orderId).get();
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const order = orderDoc.data() as PrescriptionOrder;

    // Generate receipt
    return await this.generateReceipt({
      payment,
      order,
      pharmacyInfo,
      customerInfo
    });
  }

  /**
   * Get receipt PDF buffer
   */
  async getReceiptPDF(receiptId: string): Promise<Buffer | null> {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) {
      return null;
    }

    // In real implementation, this would fetch from cloud storage
    // For now, we'll regenerate the PDF
    const request: ReceiptGenerationRequest = {
      payment: { 
        paymentId: receipt.paymentId,
        orderId: receipt.orderId,
        amount: receipt.receiptDetails.totalAmount,
        currency: receipt.receiptDetails.currency,
        gateway: receipt.gateway,
        transactionId: 'regenerated',
        status: 'succeeded',
        receiptDetails: receipt.receiptDetails,
        createdAt: receipt.createdAt,
        updatedAt: receipt.createdAt
      },
      order: { orderId: receipt.orderId } as PrescriptionOrder,
      pharmacyInfo: receipt.receiptDetails.pharmacyInfo
    };

    const pdfBuffer = await this.generatePDF(receipt.receiptDetails, request);
    return pdfBuffer;
  }
}

export const receiptService = new ReceiptService();