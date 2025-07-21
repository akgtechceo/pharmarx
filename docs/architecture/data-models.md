# Data Models

This section defines the core TypeScript interfaces that will be shared between the frontend and backend.

## User Model
```typescript
interface User {
  uid: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'pharmacist';
  email?: string;
  phoneNumber?: string;
  displayName: string;
  createdAt: Date;
}
```

## PatientProfile Model
```typescript
interface PatientProfile {
  profileId: string;
  managedByUid: string;
  patientName: string;
  dateOfBirth: Date;
  insuranceDetails?: {
    provider: string;
    policyNumber: string;
  };
}
```

## PrescriptionOrder Model
```typescript
interface PrescriptionOrder {
  orderId: string;
  patientProfileId: string;
  status: 'pending_verification' | 'awaiting_payment' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected';
  originalImageUrl: string;
  medicationDetails: {
    name: string;
    dosage: string;
    quantity: number;
  };
  cost: number;
  createdAt: Date;
}
```

## Payment Model
```typescript
interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  gateway: 'mtn' | 'stripe' | 'paypal';
  transactionId: string;
  status: 'succeeded' | 'failed';
  receiptDetails: object; // For facture normalisée data
}
``` 