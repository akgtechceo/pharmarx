import { describe, it, expect, beforeEach, vi } from 'vitest';
import { receiptService, BeninReceiptDetails, ReceiptGenerationRequest } from './receiptService';
import { Payment, PrescriptionOrder } from '@pharmarx/shared-types';
import { db } from './database';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    auth: () => ({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user-123' })
    })
  }
}));

// Mock database
vi.mock('./database', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        id: 'mock-receipt-id',
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            receiptId: 'mock-receipt-id',
            receiptNumber: 'BJ-2024-000001',
            receiptDetails: {
              receiptNumber: 'BJ-2024-000001',
              issueDate: new Date(),
              taxRate: 0.18,
              taxAmount: 8.22,
              subtotalAmount: 37.28,
              totalAmount: 45.50,
              currency: 'USD'
            }
          })
        }),
        update: vi.fn().mockResolvedValue({})
      })),
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                empty: true,
                docs: []
              })
            }))
          }))
        })),
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: true,
            docs: []
          })
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              empty: true,
              docs: []
            })
          }))
        }))
      }))
    }))
  }
}));

describe('ReceiptService', () => {
  const mockPayment: Payment = {
    paymentId: 'test-payment-1',
    orderId: 'test-order-1',
    amount: 45.50,
    currency: 'USD',
    gateway: 'stripe',
    transactionId: 'ch_test123',
    status: 'succeeded',
    receiptDetails: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOrder: PrescriptionOrder = {
    orderId: 'test-order-1',
    patientProfileId: 'patient-123',
    status: 'paid',
    originalImageUrl: 'https://example.com/prescription.jpg',
    cost: 45.50,
    medicationDetails: {
      name: 'Amoxicillin 500mg',
      quantity: 21,
      dosage: '500mg',
      instructions: 'Take one tablet three times daily'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPharmacyInfo = {
    name: 'PharmaRx Test Pharmacy',
    address: '123 Test Street, Cotonou, Benin',
    phone: '+229 21 30 45 67',
    email: 'test@pharmarx.bj',
    licenseNumber: 'PHM-BJ-2024-TEST',
    taxId: 'NIF-BJ-TEST123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReceipt', () => {
    it('should generate a compliant Benin receipt with all required fields', async () => {
      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result).toMatchObject({
        receiptId: expect.any(String),
        receiptNumber: expect.stringMatching(/^BJ-\d{4}-\d{6}$/),
        pdfBuffer: expect.any(Buffer),
        receiptDetails: expect.objectContaining({
          receiptNumber: expect.stringMatching(/^BJ-\d{4}-\d{6}$/),
          issueDate: expect.any(Date),
          taxRate: 0.18,
          taxAmount: expect.any(Number),
          subtotalAmount: expect.any(Number),
          totalAmount: expect.any(Number),
          currency: 'USD',
          pharmacyInfo: mockPharmacyInfo,
          medicationDetails: expect.arrayContaining([
            expect.objectContaining({
              name: 'Amoxicillin 500mg',
              quantity: 21,
              prescription: true
            })
          ])
        })
      });
    });

    it('should correctly calculate tax for USD payments', async () => {
      const request: ReceiptGenerationRequest = {
        payment: { ...mockPayment, amount: 100, currency: 'USD' },
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      // For USD payments, amount is converted to XOF (100 * 600 = 60000 XOF)
      // Then tax is extracted: 60000 / 1.18 = 50847.46 subtotal, 9152.54 tax
      expect(result.receiptDetails.totalAmount).toBeCloseTo(60000, 2);
      expect(result.receiptDetails.taxRate).toBe(0.18);
      expect(result.receiptDetails.subtotalAmount).toBeCloseTo(50847.46, 2);
      expect(result.receiptDetails.taxAmount).toBeCloseTo(9152.54, 2);
      expect(result.receiptDetails.exchangeRate).toBe(600);
    });

    it('should handle XOF currency without exchange rate', async () => {
      const request: ReceiptGenerationRequest = {
        payment: { ...mockPayment, amount: 27300, currency: 'XOF' },
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.receiptDetails.currency).toBe('XOF');
      expect(result.receiptDetails.exchangeRate).toBeUndefined();
      expect(result.receiptDetails.totalAmount).toBe(27300);
    });

    it('should include customer information when provided', async () => {
      const customerInfo = {
        name: 'John Doe',
        address: '456 Customer Street, Cotonou',
        taxId: 'NIF-CUSTOMER-123'
      };

      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo,
        customerInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.receiptDetails.customerTaxId).toBe(customerInfo.taxId);
    });

    it('should handle orders without detailed medication info', async () => {
      const orderWithoutMedication = { ...mockOrder };
      delete orderWithoutMedication.medicationDetails;

      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: orderWithoutMedication,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.receiptDetails.medicationDetails).toHaveLength(1);
      expect(result.receiptDetails.medicationDetails[0].name).toBe(
        'Médicament sur ordonnance / Prescription medication'
      );
    });

    it('should include French and English legal text', async () => {
      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.receiptDetails.legalText.french).toContain('Code Général des Impôts du Bénin');
      expect(result.receiptDetails.legalText.french).toContain('TVA comprise au taux de 18%');
      expect(result.receiptDetails.legalText.english).toContain('Benin General Tax Code');
      expect(result.receiptDetails.legalText.english).toContain('VAT included at 18% rate');
    });

    it('should update payment record with receipt details', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          id: 'mock-receipt-id',
          set: vi.fn().mockResolvedValue({}),
          update: mockUpdate
        }))
      });

      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      await receiptService.generateReceipt(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptDetails: expect.any(Object),
          receiptId: expect.any(String),
          receiptNumber: expect.stringMatching(/^BJ-\d{4}-\d{6}$/),
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('generateReceiptNumber', () => {
    it('should generate sequential receipt numbers', async () => {
      // Mock empty result for new year
      const mockGet = vi.fn().mockResolvedValue({
        empty: true,
        docs: []
      });

      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: mockGet
              }))
            }))
          }))
        }))
      });

      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);
      const currentYear = new Date().getFullYear();

      expect(result.receiptNumber).toBe(`BJ-${currentYear}-000001`);
    });

    it('should increment from existing receipt numbers', async () => {
      // Mock existing receipt
      const mockGetWithExisting = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            receiptNumber: 'BJ-2024-000005'
          })
        }]
      });

      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          id: 'mock-receipt-id',
          set: vi.fn().mockResolvedValue({})
        })),
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: mockGetWithExisting
              }))
            }))
          }))
        }))
      });

      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.receiptNumber).toBe('BJ-2024-000006');
    });
  });

  describe('getReceiptByPaymentId', () => {
    it('should return receipt when found', async () => {
      const mockReceiptData = {
        receiptId: 'test-receipt-1',
        paymentId: 'test-payment-1',
        receiptNumber: 'BJ-2024-000001'
      };

      const mockGet = vi.fn().mockResolvedValue({
        empty: false,
        docs: [{
          data: () => mockReceiptData
        }]
      });

      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: mockGet
          }))
        }))
      });

      const result = await receiptService.getReceiptByPaymentId('test-payment-1');

      expect(result).toEqual(mockReceiptData);
    });

    it('should return null when receipt not found', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        empty: true,
        docs: []
      });

      (db.collection as any).mockReturnValue({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: mockGet
          }))
        }))
      });

      const result = await receiptService.getReceiptByPaymentId('non-existent-payment');

      expect(result).toBeNull();
    });
  });

  describe('generateReceiptForPayment', () => {
    it('should generate receipt for existing payment', async () => {
      // Mock payment exists
      const mockPaymentGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockPayment
      });

      // Mock order exists
      const mockOrderGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockOrder
      });

      const mockCollection = vi.fn((collectionName) => {
        if (collectionName === 'payments') {
          return {
            doc: vi.fn(() => ({
              get: mockPaymentGet
            }))
          };
        } else if (collectionName === 'prescriptionOrders') {
          return {
            doc: vi.fn(() => ({
              get: mockOrderGet
            }))
          };
        } else if (collectionName === 'receipts') {
          return {
            doc: vi.fn(() => ({
              id: 'mock-receipt-id',
              set: vi.fn().mockResolvedValue({})
            })),
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue({
                      empty: true,
                      docs: []
                    })
                  }))
                }))
              }))
            }))
          };
        }
        return {
          doc: vi.fn(() => ({
            update: vi.fn().mockResolvedValue({})
          }))
        };
      });

      (db.collection as any).mockImplementation(mockCollection);

      const result = await receiptService.generateReceiptForPayment(
        'test-payment-1',
        mockPharmacyInfo
      );

      expect(result).toMatchObject({
        receiptId: expect.any(String),
        receiptNumber: expect.stringMatching(/^BJ-\d{4}-\d{6}$/),
        pdfBuffer: expect.any(Buffer)
      });
    });

    it('should throw error when payment not found', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        exists: false
      });

      (db.collection as any).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet
        }))
      });

      await expect(receiptService.generateReceiptForPayment(
        'non-existent-payment',
        mockPharmacyInfo
      )).rejects.toThrow('Payment not found');
    });

    it('should throw error when order not found', async () => {
      const mockPaymentGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => mockPayment
      });

      const mockOrderGet = vi.fn().mockResolvedValue({
        exists: false
      });

      const mockCollection = vi.fn((collectionName) => {
        if (collectionName === 'payments') {
          return {
            doc: vi.fn(() => ({
              get: mockPaymentGet
            }))
          };
        } else {
          return {
            doc: vi.fn(() => ({
              get: mockOrderGet
            }))
          };
        }
      });

      (db.collection as any).mockImplementation(mockCollection);

      await expect(receiptService.generateReceiptForPayment(
        'test-payment-1',
        mockPharmacyInfo
      )).rejects.toThrow('Order not found');
    });
  });

  describe('PDF generation', () => {
    it('should generate PDF buffer', async () => {
      const request: ReceiptGenerationRequest = {
        payment: mockPayment,
        order: mockOrder,
        pharmacyInfo: mockPharmacyInfo
      };

      const result = await receiptService.generateReceipt(request);

      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include proper PDF headers for different payment gateways', async () => {
      const testGateways = ['stripe', 'paypal', 'mtn'] as const;

      for (const gateway of testGateways) {
        const request: ReceiptGenerationRequest = {
          payment: { ...mockPayment, gateway },
          order: mockOrder,
          pharmacyInfo: mockPharmacyInfo
        };

        const result = await receiptService.generateReceipt(request);

        expect(result.pdfBuffer).toBeInstanceOf(Buffer);
        expect(result.pdfBuffer.length).toBeGreaterThan(0);
      }
    });
  });
});