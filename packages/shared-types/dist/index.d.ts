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
//# sourceMappingURL=index.d.ts.map