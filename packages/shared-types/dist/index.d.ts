export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'patient' | 'pharmacist' | 'admin';
    createdAt: Date;
    updatedAt: Date;
}
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
export * from './index';
//# sourceMappingURL=index.d.ts.map