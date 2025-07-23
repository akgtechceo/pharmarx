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