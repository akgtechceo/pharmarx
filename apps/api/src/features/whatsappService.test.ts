import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WhatsAppService } from './whatsappService';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
const mockEnv = {
  WHATSAPP_ACCESS_TOKEN: 'test-whatsapp-token',
  WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
  WHATSAPP_BUSINESS_ACCOUNT_ID: 'test-business-id'
};

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService;
  let mockFetch: any;

  beforeEach(() => {
    // Reset environment variables
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });

    whatsappService = new WhatsAppService();
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('sendMessage', () => {
    it('should send a WhatsApp message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '22912345678' }],
          messages: [{ id: 'msg_123' }]
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.sendMessage('+22912345678', 'Test message');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        messageId: 'msg_123',
        recipientId: '22912345678'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-whatsapp-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '22912345678',
            type: 'text',
            text: {
              body: 'Test message'
            }
          })
        }
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid phone number format',
            type: 'OAuthException',
            code: 100
          }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.sendMessage('+invalid-phone', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await whatsappService.sendMessage('+22912345678', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send WhatsApp message: Network timeout');
    });

    it('should clean phone numbers correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '22912345678' }],
          messages: [{ id: 'msg_123' }]
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      // Test various phone number formats
      const phoneFormats = [
        '+229 12 34 56 78',
        '229-12-34-56-78',
        '(229) 12 34 56 78',
        '+229.12.34.56.78'
      ];

      for (const phoneNumber of phoneFormats) {
        await whatsappService.sendMessage(phoneNumber, 'Test message');
        
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const requestBody = JSON.parse(lastCall[1].body);
        expect(requestBody.to).toBe('22912345678');
      }
    });

    it('should validate phone numbers', async () => {
      const invalidPhoneNumbers = [
        'invalid-phone',
        '123', // Too short
        '+1234567890123456', // Too long
        '', // Empty
        '+229 invalid'
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        const result = await whatsappService.sendMessage(phoneNumber, 'Test message');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid phone number');
      }
    });

    it('should handle empty message text', async () => {
      const result = await whatsappService.sendMessage('+22912345678', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message text cannot be empty');
    });

    it('should handle rate limiting errors', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Rate limit exceeded',
            type: 'OAuthException',
            code: 4
          }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.sendMessage('+22912345678', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send a template message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          messaging_product: 'whatsapp',
          contacts: [{ wa_id: '22912345678' }],
          messages: [{ id: 'msg_template_123' }]
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.sendTemplateMessage(
        '+22912345678',
        'payment_reminder',
        'en',
        ['PharmaRx', '$45.50', 'https://pharmarx.com/pay/token123']
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        messageId: 'msg_template_123',
        recipientId: '22912345678'
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.type).toBe('template');
      expect(requestBody.template.name).toBe('payment_reminder');
      expect(requestBody.template.language.code).toBe('en');
      expect(requestBody.template.components[0].parameters).toHaveLength(3);
    });

    it('should handle template not found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Template not found',
            type: 'OAuthException',
            code: 132000
          }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.sendTemplateMessage(
        '+22912345678',
        'non_existent_template',
        'en',
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });

    it('should validate template parameters', async () => {
      const result = await whatsappService.sendTemplateMessage(
        '+22912345678',
        '', // Empty template name
        'en',
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template name cannot be empty');
    });
  });

  describe('isConfigured', () => {
    it('should return true when all required config is present', () => {
      expect(whatsappService.isConfigured()).toBe(true);
    });

    it('should return false when access token is missing', () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      whatsappService = new WhatsAppService();

      expect(whatsappService.isConfigured()).toBe(false);
    });

    it('should return false when phone number ID is missing', () => {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      whatsappService = new WhatsAppService();

      expect(whatsappService.isConfigured()).toBe(false);
    });

    it('should return false when business account ID is missing', () => {
      delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      whatsappService = new WhatsAppService();

      expect(whatsappService.isConfigured()).toBe(false);
    });
  });

  describe('getBusinessProfile', () => {
    it('should retrieve business profile successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{
            id: 'test-business-id',
            name: 'PharmaRx',
            category: 'HEALTH',
            description: 'Online pharmacy service',
            profile_picture_url: 'https://example.com/profile.jpg'
          }]
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.getBusinessProfile();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'test-business-id',
        name: 'PharmaRx',
        category: 'HEALTH',
        description: 'Online pharmacy service',
        profilePictureUrl: 'https://example.com/profile.jpg'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-business-id?fields=name,category,description,profile_picture_url',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-whatsapp-token'
          }
        }
      );
    });

    it('should handle business profile errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Business account not found',
            type: 'OAuthException',
            code: 803
          }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await whatsappService.getBusinessProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Business account not found');
    });
  });

  describe('formatPaymentMessage', () => {
    it('should format payment message correctly', () => {
      const message = whatsappService.formatPaymentMessage(
        'Amoxicillin 500mg',
        45.50,
        'https://pharmarx.com/pay/token123'
      );

      expect(message).toContain('💊 *PharmaRx Payment Request*');
      expect(message).toContain('Medication: *Amoxicillin 500mg*');
      expect(message).toContain('Amount: *$45.5*');
      expect(message).toContain('https://pharmarx.com/pay/token123');
      expect(message).toContain('⏰ This link expires in 48 hours');
      expect(message).toContain('🔒 Secure payment powered by PharmaRx');
    });

    it('should handle long medication names', () => {
      const longMedicationName = 'Very Long Medication Name That Exceeds Normal Length 500mg Extended Release Tablets';
      
      const message = whatsappService.formatPaymentMessage(
        longMedicationName,
        45.50,
        'https://pharmarx.com/pay/token123'
      );

      expect(message).toContain(longMedicationName);
      expect(message.length).toBeLessThan(4096); // WhatsApp message limit
    });

    it('should format currency correctly', () => {
      const testCases = [
        { amount: 45.50, expected: '$45.5' },
        { amount: 100, expected: '$100' },
        { amount: 0.99, expected: '$0.99' },
        { amount: 1234.56, expected: '$1234.56' }
      ];

      for (const testCase of testCases) {
        const message = whatsappService.formatPaymentMessage(
          'Test Medication',
          testCase.amount,
          'https://example.com'
        );
        expect(message).toContain(`Amount: *${testCase.expected}*`);
      }
    });
  });

  describe('Phone Number Validation and Cleaning', () => {
    it('should accept valid international phone numbers', () => {
      const validNumbers = [
        '+22912345678',
        '+233123456789',
        '+234123456789',
        '+225123456789',
        '+22612345678',
        '+22712345678',
        '+22812345678'
      ];

      for (const number of validNumbers) {
        const cleaned = whatsappService['cleanPhoneNumber'](number);
        expect(cleaned).toBeTruthy();
        expect(cleaned).not.toContain('+');
        expect(cleaned).not.toContain(' ');
        expect(cleaned).not.toContain('-');
      }
    });

    it('should reject invalid phone number formats', () => {
      const invalidNumbers = [
        'not-a-phone',
        '123',
        '+1234567890123456', // Too long
        '+229', // Too short
        '229123456789' // Missing +
      ];

      for (const number of invalidNumbers) {
        const isValid = whatsappService['validatePhoneNumber'](number);
        expect(isValid).toBe(false);
      }
    });

    it('should handle West African country codes correctly', () => {
      const countryNumbers = [
        { input: '+229 12 34 56 78', expected: '22912345678' }, // Benin
        { input: '+233 12 345 6789', expected: '233123456789' }, // Ghana
        { input: '+234 12 345 6789', expected: '234123456789' }, // Nigeria
        { input: '+225 12 34 56 78', expected: '22512345678' }, // Côte d'Ivoire
        { input: '+226 12 34 56 78', expected: '22612345678' }, // Burkina Faso
        { input: '+227 12 34 56 78', expected: '22712345678' }, // Niger
        { input: '+228 12 34 56 78', expected: '22812345678' }  // Togo
      ];

      for (const testCase of countryNumbers) {
        const cleaned = whatsappService['cleanPhoneNumber'](testCase.input);
        expect(cleaned).toBe(testCase.expected);
      }
    });
  });

  describe('Error Message Parsing', () => {
    it('should parse standard WhatsApp API errors', () => {
      const errors = [
        { 
          response: { error: { message: 'Invalid phone number', code: 100 } },
          expected: 'Invalid phone number'
        },
        {
          response: { error: { message: 'Rate limit exceeded', code: 4 } },
          expected: 'Rate limit exceeded'
        },
        {
          response: { error: { error_user_msg: 'User-friendly error message' } },
          expected: 'User-friendly error message'
        }
      ];

      for (const testCase of errors) {
        const parsed = whatsappService['parseErrorMessage'](testCase.response);
        expect(parsed).toBe(testCase.expected);
      }
    });

    it('should handle malformed error responses', () => {
      const malformedResponses = [
        {},
        { error: {} },
        { error: { code: 123 } }, // No message
        null,
        undefined
      ];

      for (const response of malformedResponses) {
        const parsed = whatsappService['parseErrorMessage'](response);
        expect(parsed).toBe('Unknown WhatsApp API error');
      }
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with proper configuration', () => {
      const service = new WhatsAppService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should handle missing environment variables gracefully', () => {
      // Clear all environment variables
      Object.keys(mockEnv).forEach(key => {
        delete process.env[key];
      });

      const service = new WhatsAppService();
      expect(service.isConfigured()).toBe(false);

      // Service methods should fail gracefully
      expect(async () => {
        const result = await service.sendMessage('+22912345678', 'Test');
        expect(result.success).toBe(false);
        expect(result.error).toContain('WhatsApp service not configured');
      }).not.toThrow();
    });
  });
});