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
  async sendMessage(recipientPhone: string, message: string): Promise<{ 
    success: boolean; 
    data?: { messageId: string; recipientId: string };
    error?: string 
  }> {
    try {
      // Check if WhatsApp is properly configured
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      // Validate message text
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message text cannot be empty'
        };
      }

      // Clean and validate phone number
      const cleanedPhone = this.cleanPhoneNumber(recipientPhone);
      if (!this.validatePhoneNumber(cleanedPhone)) {
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
          error: this.parseErrorMessage(errorData)
        };
      }

      const result = await response.json();
      console.log('WhatsApp message sent successfully:', result);

      return {
        success: true,
        data: {
          messageId: result.messages?.[0]?.id || 'msg_' + Date.now(),
          recipientId: cleanedPhone
        }
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send WhatsApp message: ${errorMessage}`
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
  ): Promise<{ 
    success: boolean; 
    data?: { messageId: string; recipientId: string };
    error?: string 
  }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      // Validate template name
      if (!templateName || templateName.trim().length === 0) {
        return {
          success: false,
          error: 'Template name cannot be empty'
        };
      }

      // Clean and validate phone number
      const cleanedPhone = this.cleanPhoneNumber(recipientPhone);
      if (!this.validatePhoneNumber(cleanedPhone)) {
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
            code: 'en'
          },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ] : undefined
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
        console.error('WhatsApp template error:', errorData);
        
        // Check for specific template errors
        if (errorData?.error?.code === 100) {
          return {
            success: false,
            error: 'Template not found'
          };
        }
        
        return {
          success: false,
          error: this.parseErrorMessage(errorData)
        };
      }

      const result = await response.json();
      console.log('WhatsApp template message sent successfully:', result);

      return {
        success: true,
        data: {
          messageId: result.messages?.[0]?.id || 'msg_template_' + Date.now(),
          recipientId: cleanedPhone
        }
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
  async getBusinessProfile(): Promise<{ 
    success: boolean; 
    data?: { id: string; name: string; category: string; description: string; profilePictureUrl?: string };
    error?: string 
  }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp API not configured'
        };
      }

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.phoneNumberId}?fields=name,status,quality_rating,profile_picture_url`,
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
          error: this.parseErrorMessage(errorData)
        };
      }

      const result = await response.json();
      
      // Transform the response to match expected format
      return {
        success: true,
        data: {
          id: this.phoneNumberId,
          name: result.name || 'PharmaRx',
          category: 'HEALTH',
          description: 'Online pharmacy service',
          profilePictureUrl: result.profile_picture_url
        }
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
   * Clean phone number to WhatsApp format (remove + and spaces)
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // Ensure it doesn't start with +
    return cleaned;
  }

  /**
   * Validate phone number format for WhatsApp
   */
  private validatePhoneNumber(phone: string): boolean {
    // WhatsApp requires numbers without + prefix
    const whatsappRegex = /^[1-9]\d{1,14}$/;
    return whatsappRegex.test(phone);
  }

  /**
   * Get user-friendly error message from WhatsApp API response
   */
  private parseErrorMessage(errorData: any): string {
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
    switch (errorData?.status) {
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
        return `WhatsApp API error (${errorData?.status || 'N/A'})`;
    }
  }

  /**
   * Format payment message for WhatsApp
   */
  formatPaymentMessage(paymentUrl: string, medicationName: string, cost: number): string {
    // Ensure cost is a number and format it
    const formattedCost = typeof cost === 'number' ? cost.toFixed(2) : '0.00';
    
    return `💊 *PharmaRx Payment Request*\n\n` +
           `Someone has requested your help to pay for their medication:\n\n` +
           `💊 *Medication:* ${medicationName}\n` +
           `💰 *Amount:* $${formattedCost}\n\n` +
           `Please use this secure link to complete the payment:\n` +
           `🔗 ${paymentUrl}\n\n` +
           `*Link expires in 48 hours. Thank you for helping!*`;
  }
}