export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;

  constructor() {
    this.apiUrl = 'https://graph.facebook.com';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp API credentials not configured. WhatsApp messaging will not work.');
    }
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendMessage(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if WhatsApp is properly configured
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp API not configured'
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

      const messageData = {
        messaging_product: 'whatsapp',
        to: cleanedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('WhatsApp API error:', errorData);
        
        return {
          success: false,
          error: this.getErrorMessage(response.status, errorData)
        };
      }

      const result = await response.json();
      console.log('WhatsApp message sent successfully:', result);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: 'Network error while sending WhatsApp message'
      };
    }
  }

  /**
   * Send a template message with payment link
   * This is useful if you have pre-approved message templates
   */
  async sendTemplateMessage(
    recipientPhone: string,
    templateName: string,
    parameters: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp API not configured'
        };
      }

      const cleanedPhone = this.cleanPhoneNumber(recipientPhone);
      if (!this.isValidPhoneNumber(cleanedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const messageData = {
        messaging_product: 'whatsapp',
        to: cleanedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en_US'
          },
          components: [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ]
        }
      };

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('WhatsApp template message error:', errorData);
        
        return {
          success: false,
          error: this.getErrorMessage(response.status, errorData)
        };
      }

      const result = await response.json();
      console.log('WhatsApp template message sent successfully:', result);

      return {
        success: true
      };
    } catch (error) {
      console.error('Error sending WhatsApp template message:', error);
      return {
        success: false,
        error: 'Network error while sending WhatsApp template message'
      };
    }
  }

  /**
   * Check if WhatsApp API is properly configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Get WhatsApp business profile information
   * Useful for health checks and verification
   */
  async getBusinessProfile(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp API not configured'
        };
      }

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.phoneNumberId}?fields=name,status,quality_rating`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
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
      console.error('Error getting WhatsApp business profile:', error);
      return {
        success: false,
        error: 'Network error while fetching business profile'
      };
    }
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
   * Get user-friendly error message from WhatsApp API response
   */
  private getErrorMessage(statusCode: number, errorData: any): string {
    // Check for specific WhatsApp API error codes
    if (errorData?.error?.code) {
      switch (errorData.error.code) {
        case 131026:
          return 'Message not delivered - recipient may not have WhatsApp';
        case 131047:
          return 'Message not delivered - recipient phone number not supported';
        case 131052:
          return 'Message not sent - media parameter missing';
        case 132000:
          return 'Rate limit exceeded - too many messages sent';
        case 133016:
          return 'Message not delivered - recipient cannot be reached';
        default:
          return errorData.error.message || 'WhatsApp API error';
      }
    }

    // Fallback to HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid request - check message format';
      case 401:
        return 'Authentication failed - check access token';
      case 403:
        return 'Forbidden - insufficient permissions';
      case 404:
        return 'WhatsApp Business API endpoint not found';
      case 429:
        return 'Rate limit exceeded - try again later';
      case 500:
        return 'WhatsApp server error - try again later';
      default:
        return `WhatsApp API error (${statusCode})`;
    }
  }

  /**
   * Format payment message with proper WhatsApp formatting
   */
  formatPaymentMessage(paymentUrl: string, medicationName: string, cost: number): string {
    return `🏥 *PharmaRx Payment Request*\n\n` +
           `Someone has requested your help to pay for their medication:\n\n` +
           `💊 *Medication:* ${medicationName}\n` +
           `💰 *Amount:* $${cost.toFixed(2)}\n\n` +
           `Please use this secure link to complete the payment:\n` +
           `🔗 ${paymentUrl}\n\n` +
           `⏰ This link expires in 48 hours\n` +
           `✅ Your payment is secure and protected\n\n` +
           `Thank you for helping! 🙏`;
  }
}