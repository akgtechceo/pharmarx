export interface PaymentLink {
  linkId: string;
  orderId: string;
  paymentToken: string;
  recipientPhone: string;
  messageType: 'whatsapp' | 'sms';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export interface PaymentLinkRequest {
  orderId: string;
  recipientPhone: string;
  messageType: 'whatsapp' | 'sms';
}

export interface PaymentLinkResponse {
  success: boolean;
  data?: {
    linkId: string;
    paymentToken: string;
    publicUrl: string;
    expiresAt: Date;
  };
  error?: string;
}

export interface PublicPaymentInfo {
  orderId: string;
  medicationName: string;
  cost: number;
  currency: string;
  pharmacyName: string;
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
}

export interface PublicPaymentRequest {
  paymentToken: string;
  gateway: 'stripe' | 'paypal' | 'mtn';
  amount: number;
  currency: string;
  paymentData: any;
}

export interface PublicPaymentResponse {
  success: boolean;
  data?: {
    paymentId: string;
    transactionId: string;
    receiptUrl?: string;
  };
  error?: string;
}

export interface PaymentLinkValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
  error?: string;
}