// User types
export enum UserRole {
  Patient = 'patient',
  Caregiver = 'caregiver', 
  Doctor = 'doctor',
  Pharmacist = 'pharmacist'
}

export interface User {
  uid: string;
  role: UserRole;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  createdAt: Date;
}

// User validation types
export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
}

// User creation input (without uid and createdAt which are auto-generated)
export interface CreateUserInput {
  role: UserRole;
  email?: string;
  phoneNumber?: string;
  displayName: string;
}

// User validation functions
export const validateUser = (user: Partial<User>): UserValidationResult => {
  const errors: string[] = [];

  // Validate required fields
  if (!user.uid || typeof user.uid !== 'string' || user.uid.trim() === '') {
    errors.push('uid is required and must be a non-empty string');
  }

  if (!user.role || !Object.values(UserRole).includes(user.role as UserRole)) {
    errors.push('role is required and must be one of: patient, caregiver, doctor, pharmacist');
  }

  if (!user.displayName || typeof user.displayName !== 'string' || user.displayName.trim() === '') {
    errors.push('displayName is required and must be a non-empty string');
  }

  if (!user.createdAt || !(user.createdAt instanceof Date)) {
    errors.push('createdAt is required and must be a Date object');
  }

  // Validate that at least one contact method is provided
  const hasEmail = user.email && typeof user.email === 'string' && user.email.trim() !== '';
  const hasPhoneNumber = user.phoneNumber && typeof user.phoneNumber === 'string' && user.phoneNumber.trim() !== '';

  if (!hasEmail && !hasPhoneNumber) {
    errors.push('Either email or phoneNumber must be provided');
  }

  // Validate email format if provided
  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email!)) {
      errors.push('email must be a valid email address format');
    }
  }

  // Validate phone number format if provided (basic validation)
  if (hasPhoneNumber) {
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(user.phoneNumber!)) {
      errors.push('phoneNumber must contain only digits, spaces, hyphens, parentheses, and optional plus sign');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCreateUserInput = (input: CreateUserInput): UserValidationResult => {
  const errors: string[] = [];

  if (!input.role || !Object.values(UserRole).includes(input.role)) {
    errors.push('role is required and must be one of: patient, caregiver, doctor, pharmacist');
  }

  if (!input.displayName || typeof input.displayName !== 'string' || input.displayName.trim() === '') {
    errors.push('displayName is required and must be a non-empty string');
  }

  // Validate that at least one contact method is provided
  const hasEmail = input.email && typeof input.email === 'string' && input.email.trim() !== '';
  const hasPhoneNumber = input.phoneNumber && typeof input.phoneNumber === 'string' && input.phoneNumber.trim() !== '';

  if (!hasEmail && !hasPhoneNumber) {
    errors.push('Either email or phoneNumber must be provided');
  }

  // Validate email format if provided
  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email!)) {
      errors.push('email must be a valid email address format');
    }
  }

  // Validate phone number format if provided (basic validation)
  if (hasPhoneNumber) {
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(input.phoneNumber!)) {
      errors.push('phoneNumber must contain only digits, spaces, hyphens, parentheses, and optional plus sign');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Prescription Order types
export type PrescriptionOrderStatus = 
  | 'pending_verification' 
  | 'awaiting_verification'
  | 'awaiting_payment' 
  | 'preparing' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'rejected';

export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MedicationDetails {
  name: string;
  dosage: string;
  quantity: number;
}

// Pharmacist review interface
export interface PharmacistReview {
  reviewedBy: string;
  reviewedAt: Date;
  approved: boolean;
  rejectionReason?: string;
  editedDetails?: {
    name?: string;
    dosage?: string;
    quantity?: number;
  };
  pharmacistNotes?: string;
  calculatedCost?: number;
}

export interface PrescriptionOrder {
  orderId: string;
  patientProfileId: string;
  status: PrescriptionOrderStatus;
  originalImageUrl: string;
  // OCR-related fields
  extractedText?: string;
  ocrStatus?: OCRStatus;
  ocrConfidence?: number;
  ocrProcessedAt?: Date;
  ocrError?: string;
  medicationDetails?: MedicationDetails;
  // User verification fields
  userVerified?: boolean;
  userVerificationNotes?: string;
  // Pharmacist review fields
  pharmacistReview?: PharmacistReview;
  cost?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreatePrescriptionOrderInput {
  patientProfileId: string;
  originalImageUrl: string;
  status?: PrescriptionOrderStatus;
  // OCR processing will be triggered automatically
}

// OCR-specific types
export interface OCRProcessingRequest {
  orderId: string;
  imageUrl: string;
}

export interface OCRProcessingResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  processedAt: Date;
}

export interface OCRStatusResponse {
  orderId: string;
  status: OCRStatus;
  extractedText?: string;
  confidence?: number;
  error?: string;
  processedAt?: Date;
}

// File upload types
export interface UploadedFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

// File validation functions
export const validatePrescriptionFile = (file: File): FileValidationResult => {
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be an image (JPG, PNG) or PDF');
  }

  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }

  if (file.size === 0) {
    errors.push('File cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Order/Prescription types
export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  medications: Medication[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  price: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error handling types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Payment types
export type PaymentGateway = 'mtn' | 'stripe' | 'paypal';
export type PaymentStatus = 'succeeded' | 'failed' | 'pending';

export interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  transactionId: string;
  status: PaymentStatus;
  receiptDetails: object; // For facture normalisée data
  createdAt: Date;
  updatedAt?: Date;
}

export interface PaymentNotification {
  orderId: string;
  status: PrescriptionOrderStatus;
  calculatedCost?: number;
  medicationDetails?: MedicationDetails;
  pharmacyInfo?: {
    name: string;
    address: string;
    phone: string;
  };
  estimatedDelivery?: {
    timeframe: string;
    description: string;
  };
  approvedAt: Date;
}

// Re-export payment link types
export * from './paymentLink.types';

// Re-export delivery tracking types
export * from './deliveryTracking.types';

// Order History types
export interface OrderHistoryItem {
  orderId: string;
  status: PrescriptionOrderStatus;
  medicationDetails?: MedicationDetails;
  cost?: number;
  createdAt: Date;
  deliveredAt?: Date;
  hasReceipt: boolean;
}

export interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Profile Management Types
export interface PatientProfile {
  profileId: string;
  managedByUid: string;
  patientName: string;
  dateOfBirth: Date;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
  notificationPreferences?: {
    enableSMS: boolean;
    enableEmail: boolean;
    smsPhoneNumber?: string;
    emailAddress?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateProfileRequest {
  patientName: string;
  dateOfBirth: string; // ISO date string
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
}

export interface UpdateProfileRequest {
  patientName?: string;
  dateOfBirth?: string;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
}

export interface ProfileManagementResponse {
  profiles: PatientProfile[];
  activeProfileId?: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateCreateProfileRequest = (input: CreateProfileRequest): ProfileValidationResult => {
  const errors: string[] = [];

  if (!input.patientName || typeof input.patientName !== 'string' || input.patientName.trim() === '') {
    errors.push('patientName is required and must be a non-empty string');
  }

  if (!input.dateOfBirth || typeof input.dateOfBirth !== 'string') {
    errors.push('dateOfBirth is required and must be a valid ISO date string');
  } else {
    const date = new Date(input.dateOfBirth);
    if (isNaN(date.getTime())) {
      errors.push('dateOfBirth must be a valid date');
    }
    // Check if date is not in the future
    if (date > new Date()) {
      errors.push('dateOfBirth cannot be in the future');
    }
  }

  // Validate insurance details if provided
  if (input.insuranceDetails) {
    if (!input.insuranceDetails.provider || typeof input.insuranceDetails.provider !== 'string' || input.insuranceDetails.provider.trim() === '') {
      errors.push('insurance provider is required when insurance details are provided');
    }
    if (!input.insuranceDetails.policyNumber || typeof input.insuranceDetails.policyNumber !== 'string' || input.insuranceDetails.policyNumber.trim() === '') {
      errors.push('insurance policy number is required when insurance details are provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateProfileRequest = (input: UpdateProfileRequest): ProfileValidationResult => {
  const errors: string[] = [];

  // Validate date of birth format if provided
  if (input.dateOfBirth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.dateOfBirth)) {
      errors.push('dateOfBirth must be in YYYY-MM-DD format');
    } else {
      const date = new Date(input.dateOfBirth);
      if (isNaN(date.getTime())) {
        errors.push('dateOfBirth must be a valid date');
      }
    }
  }

  // Validate insurance details if provided
  if (input.insuranceDetails) {
    if (!input.insuranceDetails.provider || typeof input.insuranceDetails.provider !== 'string' || input.insuranceDetails.provider.trim() === '') {
      errors.push('insurance provider is required when insurance details are provided');
    }
    if (!input.insuranceDetails.policyNumber || typeof input.insuranceDetails.policyNumber !== 'string' || input.insuranceDetails.policyNumber.trim() === '') {
      errors.push('insurance policy number is required when insurance details are provided');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Doctor Prescription Types
export interface DoctorPrescriptionSubmission {
  prescriptionId: string;
  doctorUid: string;
  patientProfileId: string;
  medicationDetails: {
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
    refillsAuthorized: number;
    refillsRemaining: number;
  };
  prescriptionNotes?: string;
  submittedAt: Date;
  status: 'submitted' | 'processed' | 'delivered';
}

export interface PatientSearchResult {
  profileId: string;
  patientName: string;
  dateOfBirth: Date;
  phoneNumber?: string;
  email?: string;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
  lastPrescriptionDate?: Date;
}

export interface PatientSearchRequest {
  query: string;
  searchType: 'name' | 'phone' | 'email' | 'all';
  limit?: number;
}

export interface PrescriptionNotification {
  notificationId: string;
  patientProfileId: string;
  prescriptionId: string;
  notificationType: 'sms' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

export interface NotificationPreferences {
  enableSMS: boolean;
  enableEmail: boolean;
  smsPhoneNumber?: string;
  emailAddress?: string;
}

export interface UpdateNotificationPreferencesRequest {
  enableSMS?: boolean;
  enableEmail?: boolean;
  smsPhoneNumber?: string;
  emailAddress?: string;
}

export interface CreateDoctorPrescriptionInput {
  patientProfileId: string;
  medicationDetails: {
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
    refillsAuthorized: number;
  };
  prescriptionNotes?: string;
}

export interface DoctorPrescriptionHistoryResponse {
  prescriptions: DoctorPrescriptionSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Re-export inventory types
export * from './inventory.types'; 