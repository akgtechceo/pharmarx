import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PaymentLinkService } from './paymentLinkService';
import { WhatsAppService } from './whatsappService';
import { SMSService } from './smsService';

// Mock Firestore
const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    })),
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        get: vi.fn()
      })),
      limit: vi.fn(() => ({
        get: vi.fn()
      })),
      get: vi.fn()
    }))
  })),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000 }))
  }
};

// Mock Firebase config
vi.mock('../config/firebase', () => ({
  firestore: mockFirestore
}));

// Mock external services
vi.mock('./whatsappService');
vi.mock('./smsService');

// Mock crypto for consistent token generation in tests
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('mockrandomdata1234567890abcdef')),
  createHash: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'mock_secure_token_hash_1234567890abcdef')
    }))
  }))
}));

describe('PaymentLinkService', () => {
  let paymentLinkService: PaymentLinkService;
  let mockWhatsAppService: any;
  let mockSMSService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup service mocks
    mockWhatsAppService = {
      sendMessage: vi.fn()
    };
    mockSMSService = {
      sendSMS: vi.fn()
    };

    (WhatsAppService as any).mockImplementation(() => mockWhatsAppService);
    (SMSService as any).mockImplementation(() => mockSMSService);

    paymentLinkService = new PaymentLinkService();

    // Mock environment variables
    process.env.PUBLIC_BASE_URL = 'https://test.pharmarx.com';
  });

  describe('generatePaymentLink', () => {
    it('should generate a payment link successfully', async () => {
      const request = {
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'whatsapp' as const
      };

      const mockDocRef = {
        set: vi.fn().mockResolvedValue(undefined)
      };
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef)
      });

      const result = await paymentLinkService.generatePaymentLink(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        linkId: expect.stringMatching(/^link_[a-f0-9]{32}$/),
        paymentToken: 'mock_secure_token_hash_1234567890abcdef',
        publicUrl: 'https://test.pharmarx.com/pay/mock_secure_token_hash_1234567890abcdef',
        expiresAt: expect.any(Date)
      });

      expect(mockFirestore.collection).toHaveBeenCalledWith('paymentLinks');
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: request.orderId,
          recipientPhone: request.recipientPhone,
          messageType: request.messageType,
          isUsed: false
        })
      );
    });

    it('should handle Firestore errors gracefully', async () => {
      const request = {
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'sms' as const
      };

      const mockDocRef = {
        set: vi.fn().mockRejectedValue(new Error('Firestore connection failed'))
      };
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef)
      });

      const result = await paymentLinkService.generatePaymentLink(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate payment link');
    });

    it('should set expiration to 48 hours from creation', async () => {
      const request = {
        orderId: 'test-order-123',
        recipientPhone: '+22912345678',
        messageType: 'whatsapp' as const
      };

      const mockDocRef = {
        set: vi.fn().mockImplementation((data) => {
          const expiresAt = data.expiresAt.seconds * 1000;
          const createdAt = data.createdAt.seconds * 1000;
          const diff = expiresAt - createdAt;
          const hours = diff / (1000 * 60 * 60);
          
          expect(hours).toBeCloseTo(48, 0);
          return Promise.resolve();
        })
      };
      
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef)
      });

      await paymentLinkService.generatePaymentLink(request);
    });
  });

  describe('sendPaymentLinkMessage', () => {
    beforeEach(() => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          medicationDetails: {
            name: 'Amoxicillin 500mg'
          },
          cost: 45.50
        })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });
    });

    it('should send WhatsApp message successfully', async () => {
      mockWhatsAppService.sendMessage.mockResolvedValue({ success: true });

      const result = await paymentLinkService.sendPaymentLinkMessage(
        '+22912345678',
        'whatsapp',
        'https://test.pharmarx.com/pay/token123',
        'order-123'
      );

      expect(result.success).toBe(true);
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalledWith(
        '+22912345678',
        expect.stringContaining('Amoxicillin 500mg')
      );
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalledWith(
        '+22912345678',
        expect.stringContaining('$45.5')
      );
    });

    it('should send SMS message successfully', async () => {
      mockSMSService.sendSMS.mockResolvedValue({ success: true });

      const result = await paymentLinkService.sendPaymentLinkMessage(
        '+22912345678',
        'sms',
        'https://test.pharmarx.com/pay/token123',
        'order-123'
      );

      expect(result.success).toBe(true);
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        '+22912345678',
        expect.stringContaining('Amoxicillin 500mg')
      );
    });

    it('should handle WhatsApp service errors', async () => {
      mockWhatsAppService.sendMessage.mockResolvedValue({ 
        success: false, 
        error: 'WhatsApp API rate limit exceeded' 
      });

      const result = await paymentLinkService.sendPaymentLinkMessage(
        '+22912345678',
        'whatsapp',
        'https://test.pharmarx.com/pay/token123',
        'order-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('WhatsApp API rate limit exceeded');
    });

    it('should handle SMS service errors', async () => {
      mockSMSService.sendSMS.mockResolvedValue({ 
        success: false, 
        error: 'Invalid phone number' 
      });

      const result = await paymentLinkService.sendPaymentLinkMessage(
        '+22912345678',
        'sms',
        'https://test.pharmarx.com/pay/token123',
        'order-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number');
    });

    it('should handle network errors gracefully', async () => {
      mockWhatsAppService.sendMessage.mockRejectedValue(new Error('Network timeout'));

      const result = await paymentLinkService.sendPaymentLinkMessage(
        '+22912345678',
        'whatsapp',
        'https://test.pharmarx.com/pay/token123',
        'order-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send whatsapp message');
    });
  });

  describe('verifyOrderOwnership', () => {
    it('should return true for valid ownership', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: 'user-123'
        })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.verifyOrderOwnership('order-123', 'user-123');

      expect(result).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('prescriptionOrders');
    });

    it('should return false for non-existent order', async () => {
      const mockOrderDoc = {
        exists: false
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.verifyOrderOwnership('order-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should return false for wrong ownership', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: 'different-user-456'
        })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.verifyOrderOwnership('order-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockRejectedValue(new Error('Firestore error'))
        })
      });

      const result = await paymentLinkService.verifyOrderOwnership('order-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('getOrderStatus', () => {
    it('should return order status for existing order', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          status: 'awaiting_payment'
        })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.getOrderStatus('order-123');

      expect(result).toBe('awaiting_payment');
    });

    it('should return null for non-existent order', async () => {
      const mockOrderDoc = {
        exists: false
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.getOrderStatus('order-123');

      expect(result).toBe(null);
    });

    it('should handle missing status field', async () => {
      const mockOrderDoc = {
        exists: true,
        data: () => ({
          // No status field
        })
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockOrderDoc)
        })
      });

      const result = await paymentLinkService.getOrderStatus('order-123');

      expect(result).toBe(null);
    });
  });

  describe('getPaymentLinkByToken', () => {
    it('should return payment link for valid token', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{
          data: () => ({
            linkId: 'link-123',
            orderId: 'order-123',
            paymentToken: 'token-123',
            recipientPhone: '+22912345678',
            messageType: 'whatsapp',
            isUsed: false,
            expiresAt: { toDate: () => new Date('2024-12-21T12:00:00Z') },
            createdAt: { toDate: () => new Date('2024-12-19T12:00:00Z') }
          })
        }]
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.getPaymentLinkByToken('token-123');

      expect(result).toEqual({
        linkId: 'link-123',
        orderId: 'order-123',
        paymentToken: 'token-123',
        recipientPhone: '+22912345678',
        messageType: 'whatsapp',
        isUsed: false,
        expiresAt: new Date('2024-12-21T12:00:00Z'),
        createdAt: new Date('2024-12-19T12:00:00Z')
      });
    });

    it('should return null for non-existent token', async () => {
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.getPaymentLinkByToken('invalid-token');

      expect(result).toBe(null);
    });

    it('should handle Firestore query errors', async () => {
      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockRejectedValue(new Error('Query failed'))
          })
        })
      });

      const result = await paymentLinkService.getPaymentLinkByToken('token-123');

      expect(result).toBe(null);
    });
  });

  describe('markPaymentLinkAsUsed', () => {
    it('should mark payment link as used successfully', async () => {
      const mockDoc = {
        ref: {
          update: vi.fn().mockResolvedValue(undefined)
        }
      };

      const mockSnapshot = {
        empty: false,
        docs: [mockDoc]
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.markPaymentLinkAsUsed('token-123');

      expect(result).toBe(true);
      expect(mockDoc.ref.update).toHaveBeenCalledWith({
        isUsed: true,
        usedAt: expect.any(Object)
      });
    });

    it('should return false for non-existent token', async () => {
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.markPaymentLinkAsUsed('invalid-token');

      expect(result).toBe(false);
    });

    it('should handle update errors gracefully', async () => {
      const mockDoc = {
        ref: {
          update: vi.fn().mockRejectedValue(new Error('Update failed'))
        }
      };

      const mockSnapshot = {
        empty: false,
        docs: [mockDoc]
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.markPaymentLinkAsUsed('token-123');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredLinks', () => {
    it('should delete expired payment links', async () => {
      const mockDocs = [
        { ref: { delete: vi.fn() } },
        { ref: { delete: vi.fn() } }
      ];

      const mockSnapshot = {
        size: 2,
        docs: mockDocs
      };

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      mockFirestore.batch = vi.fn().mockReturnValue(mockBatch);

      const result = await paymentLinkService.cleanupExpiredLinks();

      expect(result).toBe(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 when no expired links found', async () => {
      const mockSnapshot = {
        size: 0,
        docs: []
      };

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockSnapshot)
          })
        })
      });

      const result = await paymentLinkService.cleanupExpiredLinks();

      expect(result).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockRejectedValue(new Error('Query failed'))
          })
        })
      });

      const result = await paymentLinkService.cleanupExpiredLinks();

      expect(result).toBe(0);
    });
  });

  describe('deactivatePaymentLink', () => {
    it('should deactivate payment link when user has access', async () => {
      const mockLinkDoc = {
        exists: true,
        data: () => ({
          orderId: 'order-123'
        })
      };

      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: 'user-123'
        })
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockLinkDoc),
            update: vi.fn().mockResolvedValue(undefined)
          })
        })
        .mockReturnValueOnce({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockOrderDoc)
          })
        });

      const result = await paymentLinkService.deactivatePaymentLink('link-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should deny access for non-existent payment link', async () => {
      const mockLinkDoc = {
        exists: false
      };

      mockFirestore.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockLinkDoc)
        })
      });

      const result = await paymentLinkService.deactivatePaymentLink('link-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment link not found');
    });

    it('should deny access for wrong user', async () => {
      const mockLinkDoc = {
        exists: true,
        data: () => ({
          orderId: 'order-123'
        })
      };

      const mockOrderDoc = {
        exists: true,
        data: () => ({
          patientProfileId: 'different-user-456'
        })
      };

      mockFirestore.collection
        .mockReturnValueOnce({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockLinkDoc)
          })
        })
        .mockReturnValueOnce({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(mockOrderDoc)
          })
        });

      const result = await paymentLinkService.deactivatePaymentLink('link-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });
});