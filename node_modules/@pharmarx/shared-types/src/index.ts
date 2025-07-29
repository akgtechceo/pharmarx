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

export interface PrescriptionOrder {
  orderId: string;
  patientProfileId: string;
  status: PrescriptionOrderStatus;
  originalImageUrl: string;
  // OCR-related fields
  extractedText?: string;
  ocrStatus?: OCRStatus;
  ocrProcessedAt?: Date;
  ocrError?: string;
  medicationDetails?: MedicationDetails;
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