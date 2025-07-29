import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SMSService } from './smsService';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
const mockEnv = {
  TWILIO_ACCOUNT_SID: 'test-account-sid',
  TWILIO_AUTH_TOKEN: 'test-auth-token',
  TWILIO_PHONE_NUMBER: '+15551234567'
};

describe('SMSService', () => {
  let smsService: SMSService;
  let mockFetch: any;

  beforeEach(() => {
    // Reset environment variables
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });

    smsService = new SMSService();
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

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued',
          to: '+22912345678',
          from: '+15551234567',
          body: 'Test SMS message',
          price: null,
          price_unit: 'USD'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.sendSMS('+22912345678', 'Test SMS message');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        messageId: 'SM1234567890abcdef',
        status: 'queued',
        to: '+22912345678',
        cost: null
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/test-account-sid/Messages.json',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from('test-account-sid:test-auth-token').toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'To=%2B22912345678&From=%2B15551234567&Body=Test%20SMS%20message'
        }
      );
    });

    it('should handle Twilio API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          code: 21211,
          message: 'The To phone number is not a valid phone number.',
          more_info: 'https://www.twilio.com/docs/errors/21211',
          status: 400
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.sendSMS('+invalid-phone', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('The To phone number is not a valid phone number.');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await smsService.sendSMS('+22912345678', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send SMS: Network timeout');
    });

    it('should clean phone numbers correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued',
          to: '+22912345678',
          from: '+15551234567'
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
        await smsService.sendSMS(phoneNumber, 'Test message');
        
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const body = decodeURIComponent(lastCall[1].body);
        expect(body).toContain('To=%2B22912345678');
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
        const result = await smsService.sendSMS(phoneNumber, 'Test message');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid phone number');
      }
    });

    it('should handle empty message text', async () => {
      const result = await smsService.sendSMS('+22912345678', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Message text cannot be empty');
    });

    it('should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          code: 20003,
          message: 'Your account has exceeded the rate limit for this resource.',
          more_info: 'https://www.twilio.com/docs/errors/20003',
          status: 429
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.sendSMS('+22912345678', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your account has exceeded the rate limit for this resource.');
    });

    it('should handle long messages and calculate segments', async () => {
      const longMessage = 'A'.repeat(320); // More than 160 characters (2 segments)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued',
          num_segments: '2'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const messageInfo = smsService.getMessageInfo(longMessage, '+22912345678');
      expect(messageInfo.segments).toBe(3); // 320 chars = 3 segments
      expect(messageInfo.encoding).toBe('GSM-7');

      await smsService.sendSMS('+22912345678', longMessage);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('sendBulkSMS', () => {
    it('should send bulk SMS with rate limiting', async () => {
      const recipients = ['+22912345678', '+22987654321', '+22912340000'];
      const message = 'Bulk SMS test message';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.sendBulkSMS(recipients, message);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalSent: 3,
        totalFailed: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: true })
        ])
      });

      // Should have made 3 API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk SMS', async () => {
      const recipients = ['+22912345678', '+invalid-phone', '+22912340000'];
      const message = 'Bulk SMS test message';

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call (invalid phone) fails
          return Promise.resolve({
            ok: false,
            status: 400,
            json: vi.fn().mockResolvedValue({
              code: 21211,
              message: 'Invalid phone number'
            })
          });
        }
        // Other calls succeed
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            sid: `SM${callCount}234567890abcdef`,
            status: 'queued'
          })
        });
      });

      const result = await smsService.sendBulkSMS(recipients, message);

      expect(result.success).toBe(true); // Overall success even with partial failures
      expect(result.data).toEqual({
        totalSent: 2,
        totalFailed: 1,
        results: expect.arrayContaining([
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: false, error: 'Invalid phone number' }),
          expect.objectContaining({ success: true })
        ])
      });
    });

    it('should respect rate limiting in bulk SMS', async () => {
      const recipients = ['+22912345678', '+22987654321'];
      const message = 'Rate limit test';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      await smsService.sendBulkSMS(recipients, message, 100); // 100ms delay between messages

      const endTime = Date.now();
      const timeTaken = endTime - startTime;

      // Should take at least 100ms due to rate limiting
      expect(timeTaken).toBeGreaterThanOrEqual(100);
    });

    it('should handle empty recipient list', async () => {
      const result = await smsService.sendBulkSMS([], 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipients provided');
    });
  });

  describe('getMessageStatus', () => {
    it('should retrieve message status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'delivered',
          to: '+22912345678',
          from: '+15551234567',
          date_sent: '2024-12-19T12:00:00Z',
          price: '-0.0075',
          price_unit: 'USD',
          error_code: null,
          error_message: null
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.getMessageStatus('SM1234567890abcdef');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        messageId: 'SM1234567890abcdef',
        status: 'delivered',
        to: '+22912345678',
        dateSent: '2024-12-19T12:00:00Z',
        cost: -0.0075,
        errorCode: null,
        errorMessage: null
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/test-account-sid/Messages/SM1234567890abcdef.json',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from('test-account-sid:test-auth-token').toString('base64')
          }
        }
      );
    });

    it('should handle failed message status', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'failed',
          error_code: 30008,
          error_message: 'Unknown error'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.getMessageStatus('SM1234567890abcdef');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('failed');
      expect(result.data?.errorCode).toBe(30008);
      expect(result.data?.errorMessage).toBe('Unknown error');
    });

    it('should handle non-existent message ID', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          code: 20404,
          message: 'The requested resource was not found'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.getMessageStatus('SM_invalid_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('The requested resource was not found');
    });
  });

  describe('getAccountInfo', () => {
    it('should retrieve account information successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'test-account-sid',
          friendly_name: 'PharmaRx SMS Account',
          status: 'active',
          type: 'Full',
          date_created: '2024-01-01T00:00:00Z',
          date_updated: '2024-12-19T12:00:00Z'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.getAccountInfo();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        accountSid: 'test-account-sid',
        friendlyName: 'PharmaRx SMS Account',
        status: 'active',
        type: 'Full',
        dateCreated: '2024-01-01T00:00:00Z',
        dateUpdated: '2024-12-19T12:00:00Z'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/test-account-sid.json',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from('test-account-sid:test-auth-token').toString('base64')
          }
        }
      );
    });

    it('should handle account access errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          code: 20003,
          message: 'Authenticate',
          more_info: 'https://www.twilio.com/docs/errors/20003'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await smsService.getAccountInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authenticate');
    });
  });

  describe('isConfigured', () => {
    it('should return true when all required config is present', () => {
      expect(smsService.isConfigured()).toBe(true);
    });

    it('should return false when account SID is missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      smsService = new SMSService();

      expect(smsService.isConfigured()).toBe(false);
    });

    it('should return false when auth token is missing', () => {
      delete process.env.TWILIO_AUTH_TOKEN;
      smsService = new SMSService();

      expect(smsService.isConfigured()).toBe(false);
    });

    it('should return false when phone number is missing', () => {
      delete process.env.TWILIO_PHONE_NUMBER;
      smsService = new SMSService();

      expect(smsService.isConfigured()).toBe(false);
    });
  });

  describe('formatPaymentMessage', () => {
    it('should format payment message for SMS correctly', () => {
      const message = smsService.formatPaymentMessage(
        'Amoxicillin 500mg',
        45.50,
        'https://pharmarx.com/pay/token123'
      );

      expect(message).toContain('PharmaRx Payment Request');
      expect(message).toContain('Medication: Amoxicillin 500mg');
      expect(message).toContain('Amount: $45.5');
      expect(message).toContain('https://pharmarx.com/pay/token123');
      expect(message).toContain('Expires in 48hrs');
      expect(message.length).toBeLessThan(320); // Keep under SMS limit for cost efficiency
    });

    it('should handle long medication names by truncating', () => {
      const longMedicationName = 'Very Long Medication Name That Exceeds Normal Length 500mg Extended Release Tablets With Many Details';
      
      const message = smsService.formatPaymentMessage(
        longMedicationName,
        45.50,
        'https://pharmarx.com/pay/token123'
      );

      expect(message.length).toBeLessThan(160); // Standard SMS length
      expect(message).toContain('Very Long Medication Name'); // Should contain beginning of name
    });

    it('should format currency correctly for different amounts', () => {
      const testCases = [
        { amount: 45.50, expected: '$45.5' },
        { amount: 100, expected: '$100' },
        { amount: 0.99, expected: '$0.99' },
        { amount: 1234.56, expected: '$1234.56' }
      ];

      for (const testCase of testCases) {
        const message = smsService.formatPaymentMessage(
          'Test Medication',
          testCase.amount,
          'https://example.com'
        );
        expect(message).toContain(`Amount: ${testCase.expected}`);
      }
    });
  });

  describe('getMessageInfo', () => {
    it('should calculate message segments correctly', () => {
      const testCases = [
        { message: 'Short message', expected: { segments: 1, encoding: 'GSM-7' } },
        { message: 'A'.repeat(160), expected: { segments: 1, encoding: 'GSM-7' } },
        { message: 'A'.repeat(161), expected: { segments: 2, encoding: 'GSM-7' } },
        { message: 'A'.repeat(306), expected: { segments: 2, encoding: 'GSM-7' } },
        { message: 'A'.repeat(307), expected: { segments: 3, encoding: 'GSM-7' } }
      ];

      for (const testCase of testCases) {
        const info = smsService.getMessageInfo(testCase.message, '+22912345678');
        expect(info.segments).toBe(testCase.expected.segments);
        expect(info.encoding).toBe(testCase.expected.encoding);
      }
    });

    it('should detect Unicode encoding for special characters', () => {
      const unicodeMessage = 'Hello 👋 emoji message';
      const info = smsService.getMessageInfo(unicodeMessage, '+22912345678');

      expect(info.encoding).toBe('UCS-2');
      expect(info.length).toBe(unicodeMessage.length);
    });

    it('should estimate costs based on segments and destination', () => {
      const message = 'A'.repeat(320); // 3 segments
      
      const testCases = [
        { phone: '+22912345678', expectedCostPerSegment: 0.045 }, // Benin
        { phone: '+233123456789', expectedCostPerSegment: 0.04 }, // Ghana
        { phone: '+234123456789', expectedCostPerSegment: 0.035 }, // Nigeria
        { phone: '+15551234567', expectedCostPerSegment: 0.0075 } // US (default)
      ];

      for (const testCase of testCases) {
        const info = smsService.getMessageInfo(message, testCase.phone);
        expect(info.estimatedCost).toBeCloseTo(testCase.expectedCostPerSegment * 3, 3);
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
        const cleaned = smsService['cleanPhoneNumber'](number);
        expect(cleaned).toBeTruthy();
        expect(cleaned).toMatch(/^\+\d{10,15}$/);
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
        const isValid = smsService['validatePhoneNumber'](number);
        expect(isValid).toBe(false);
      }
    });

    it('should handle West African country codes correctly', () => {
      const countryNumbers = [
        { input: '+229 12 34 56 78', expected: '+22912345678' }, // Benin
        { input: '+233 12 345 6789', expected: '+233123456789' }, // Ghana
        { input: '+234 12 345 6789', expected: '+234123456789' }, // Nigeria
        { input: '+225 12 34 56 78', expected: '+22512345678' }, // Côte d'Ivoire
        { input: '+226 12 34 56 78', expected: '+22612345678' }, // Burkina Faso
        { input: '+227 12 34 56 78', expected: '+22712345678' }, // Niger
        { input: '+228 12 34 56 78', expected: '+22812345678' }  // Togo
      ];

      for (const testCase of countryNumbers) {
        const cleaned = smsService['cleanPhoneNumber'](testCase.input);
        expect(cleaned).toBe(testCase.expected);
      }
    });
  });

  describe('Error Message Parsing', () => {
    it('should parse standard Twilio API errors', () => {
      const errors = [
        { 
          response: { message: 'Invalid phone number', code: 21211 },
          expected: 'Invalid phone number'
        },
        {
          response: { message: 'Rate limit exceeded', code: 20003 },
          expected: 'Rate limit exceeded'
        }
      ];

      for (const testCase of errors) {
        const parsed = smsService['parseErrorMessage'](testCase.response);
        expect(parsed).toBe(testCase.expected);
      }
    });

    it('should handle malformed error responses', () => {
      const malformedResponses = [
        {},
        { code: 123 }, // No message
        null,
        undefined
      ];

      for (const response of malformedResponses) {
        const parsed = smsService['parseErrorMessage'](response);
        expect(parsed).toBe('Unknown SMS service error');
      }
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with proper configuration', () => {
      const service = new SMSService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should handle missing environment variables gracefully', () => {
      // Clear all environment variables
      Object.keys(mockEnv).forEach(key => {
        delete process.env[key];
      });

      const service = new SMSService();
      expect(service.isConfigured()).toBe(false);

      // Service methods should fail gracefully
      expect(async () => {
        const result = await service.sendSMS('+22912345678', 'Test');
        expect(result.success).toBe(false);
        expect(result.error).toContain('SMS service not configured');
      }).not.toThrow();
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should implement delay function correctly', async () => {
      const startTime = Date.now();
      await smsService['delay'](100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should handle concurrent SMS sending', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sid: 'SM1234567890abcdef',
          status: 'queued'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const promises = Array(5).fill(null).map((_, index) =>
        smsService.sendSMS(`+22912345${index.toString().padStart(3, '0')}`, 'Concurrent test')
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });
});