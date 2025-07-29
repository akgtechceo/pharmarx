export class SMSService {
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioPhoneNumber: string;
  private readonly apiUrl: string;

  constructor() {
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.apiUrl = 'https://api.twilio.com/2010-04-01';

    if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
      console.warn('Twilio SMS credentials not configured. SMS messaging will not work.');
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async sendSMS(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if SMS is properly configured
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        return {
          success: false,
          error: 'SMS service not configured'
        };
      }

      // Clean and validate phone number
      const cleanedPhone = this.cleanPhoneNumber(recipientPhone);
      if (!this.isValidPhoneNumber(cleanedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Validate message length
      if (message.length > 1600) {
        return {
          success: false,
          error: 'Message too long (max 1600 characters)'
        };
      }

      const messageData = new URLSearchParams({
        To: cleanedPhone,
        From: this.twilioPhoneNumber,
        Body: message
      });

      // Create basic auth header
      const credentials = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const response = await fetch(
        `${this.apiUrl}/Accounts/${this.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: messageData.toString()
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Twilio SMS error:', errorData);
        
        return {
          success: false,
          error: this.getErrorMessage(response.status, errorData)
        };
      }

      const result = await response.json();
      console.log('SMS sent successfully:', result.sid);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: 'Network error while sending SMS'
      };
    }
  }

  /**
   * Send bulk SMS messages (useful for notifications)
   */
  async sendBulkSMS(
    recipients: string[],
    message: string
  ): Promise<{ success: boolean; results: Array<{ phone: string; success: boolean; error?: string }> }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    let successCount = 0;

    // Process messages in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (phone) => {
        const result = await this.sendSMS(phone, message);
        const phoneResult = {
          phone,
          success: result.success,
          error: result.error
        };
        
        if (result.success) {
          successCount++;
        }
        
        return phoneResult;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Check SMS delivery status
   */
  async getMessageStatus(messageSid: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken) {
        return {
          success: false,
          error: 'SMS service not configured'
        };
      }

      const credentials = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const response = await fetch(
        `${this.apiUrl}/Accounts/${this.twilioAccountSid}/Messages/${messageSid}.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: this.getErrorMessage(response.status, errorData)
        };
      }

      const result = await response.json();
      return {
        success: true,
        status: result.status
      };
    } catch (error) {
      console.error('Error getting message status:', error);
      return {
        success: false,
        error: 'Network error while checking message status'
      };
    }
  }

  /**
   * Get account information and balance
   */
  async getAccountInfo(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken) {
        return {
          success: false,
          error: 'SMS service not configured'
        };
      }

      const credentials = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const response = await fetch(
        `${this.apiUrl}/Accounts/${this.twilioAccountSid}.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: this.getErrorMessage(response.status, errorData)
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      return {
        success: false,
        error: 'Network error while fetching account information'
      };
    }
  }

  /**
   * Check if SMS service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.twilioAccountSid && this.twilioAuthToken && this.twilioPhoneNumber);
  }

  /**
   * Clean phone number to international format
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except the leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[1-9]\d{1,14}
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Get user-friendly error message from Twilio API response
   */
  private getErrorMessage(statusCode: number, errorData: any): string {
    // Check for specific Twilio error codes
    if (errorData?.code) {
      switch (errorData.code) {
        case 21211:
          return 'Invalid phone number format';
        case 21408:
          return 'Permission denied to send SMS to this number';
        case 21614:
          return 'SMS not supported for this phone number';
        case 21617:
          return 'Phone number is not a valid mobile number';
        case 21620:
          return 'SMS not allowed to this country';
        case 30003:
          return 'Message was not delivered - unreachable destination';
        case 30005:
          return 'Message delivery failed - unknown destination';
        case 30008:
          return 'Message delivery failed - unknown error';
        default:
          return errorData.message || 'Twilio API error';
      }
    }

    // Fallback to HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid request - check message format and phone number';
      case 401:
        return 'Authentication failed - check Twilio credentials';
      case 403:
        return 'Forbidden - insufficient permissions or account suspended';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Rate limit exceeded - too many messages sent';
      case 500:
        return 'Twilio server error - try again later';
      default:
        return `SMS API error (${statusCode})`;
    }
  }

  /**
   * Create a delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format payment message for SMS (shorter due to character limits)
   */
  formatPaymentMessage(paymentUrl: string, medicationName: string, cost: number): string {
    return `PharmaRx Payment Request\n\n` +
           `Someone needs help paying for medication: ${medicationName} ($${cost.toFixed(2)})\n\n` +
           `Secure payment link: ${paymentUrl}\n\n` +
           `Link expires in 48 hours. Thank you for helping!`;
  }

  /**
   * Get SMS character count and segment information
   */
  getMessageInfo(message: string): { 
    length: number; 
    segments: number; 
    encoding: 'GSM' | 'UCS2'; 
    cost: number 
  } {
    // Check if message contains non-GSM characters
    const gsmRegex = /^[A-Za-z0-9@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/;
    const isGSM = gsmRegex.test(message);
    
    const encoding = isGSM ? 'GSM' : 'UCS2';
    const maxSingleSegment = isGSM ? 160 : 70;
    const maxMultiSegment = isGSM ? 153 : 67;
    
    let segments: number;
    if (message.length <= maxSingleSegment) {
      segments = 1;
    } else {
      segments = Math.ceil(message.length / maxMultiSegment);
    }
    
    // Estimated cost (varies by destination, this is a rough estimate)
    const baseCost = 0.0075; // $0.0075 per segment for most destinations
    const cost = segments * baseCost;
    
    return {
      length: message.length,
      segments,
      encoding,
      cost
    };
  }
}