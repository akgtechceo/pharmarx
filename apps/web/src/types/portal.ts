export interface MedicationInfo {
  name: string;
  dosage: string;
  instructions: string;
  prescribedBy: string;
  refillsRemaining: number;
  status: 'Active' | 'Refill Soon' | 'Expired';
}

export interface AppointmentInfo {
  doctorName: string;
  type: string;
  date: string;
  time: string;
  priority?: 'urgent' | 'routine' | 'follow-up';
}

export interface PatientInfo {
  id: string;
  name: string;
  relationship?: string;
  age?: number;
  lastVisit: string;
  status: 'Active' | 'Needs Attention' | 'Up to Date' | 'Appointment Needed';
  conditions: string[];
  medicationsDue?: number;
}

export interface HealthMetric {
  name: string;
  value: string;
  unit?: string;
  lastUpdated: string;
  status: 'normal' | 'high' | 'low';
}

export interface PrescriptionInfo {
  patientName: string;
  medication: string;
  dosage: string;
  quantity: string;
  prescriber: string;
  priority: 'PRIORITY' | 'URGENT' | 'Routine';
  status: 'Received' | 'Verified' | 'Filling' | 'Ready' | 'Completed';
  submittedTime: string;
  notes?: string;
  requiresConsultation: boolean;
}

export interface ClinicalNote {
  patientName: string;
  title: string;
  content: string;
  date: string;
  author: string;
  type: 'follow-up' | 'consultation' | 'procedure';
}

export interface InventoryAlert {
  medication: string;
  currentStock: number;
  alertType: 'Low Stock' | 'Expiration Warning' | 'Order Status';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CareTask {
  id: string;
  description: string;
  completed: boolean;
  patientName?: string;
}

export interface CommunicationMessage {
  from: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'normal' | 'low';
} 