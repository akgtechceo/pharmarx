export declare enum UserRole {
    Patient = "patient",
    Caregiver = "caregiver",
    Doctor = "doctor",
    Pharmacist = "pharmacist"
}
export interface User {
    uid: string;
    role: UserRole;
    email?: string;
    phoneNumber?: string;
    displayName: string;
    createdAt: Date;
}
export interface UserValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface CreateUserInput {
    role: UserRole;
    email?: string;
    phoneNumber?: string;
    displayName: string;
}
export declare const validateUser: (user: Partial<User>) => UserValidationResult;
export declare const validateCreateUserInput: (input: CreateUserInput) => UserValidationResult;
export type PrescriptionOrderStatus = 'pending_verification' | 'awaiting_verification' | 'awaiting_payment' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected';
export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface MedicationDetails {
    name: string;
    dosage: string;
    quantity: number;
}
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
    extractedText?: string;
    ocrStatus?: OCRStatus;
    ocrConfidence?: number;
    ocrProcessedAt?: Date;
    ocrError?: string;
    medicationDetails?: MedicationDetails;
    userVerified?: boolean;
    userVerificationNotes?: string;
    pharmacistReview?: PharmacistReview;
    cost?: number;
    createdAt: Date;
    updatedAt?: Date;
}
export interface CreatePrescriptionOrderInput {
    patientProfileId: string;
    originalImageUrl: string;
    status?: PrescriptionOrderStatus;
}
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
export declare const validatePrescriptionFile: (file: File) => FileValidationResult;
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
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}
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
    receiptDetails: object;
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
export * from './paymentLink.types';
export * from './deliveryTracking.types';
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
    dateOfBirth: string;
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
export declare const validateCreateProfileRequest: (input: CreateProfileRequest) => ProfileValidationResult;
export declare const validateUpdateProfileRequest: (input: UpdateProfileRequest) => ProfileValidationResult;
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
export * from './inventory.types';
//# sourceMappingURL=index.d.ts.map