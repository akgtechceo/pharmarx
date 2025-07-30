export interface InventoryItem {
  itemId: string;
  pharmacyId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'cream' | 'other';
  strength: string;
  quantity: number;
  unit: 'tablets' | 'capsules' | 'bottles' | 'tubes' | 'vials' | 'units';
  price: number;
  currency: string;
  lastUpdated: Date;
  isAvailable: boolean;
  expiryDate?: Date;
}

export interface PharmacyLocation {
  pharmacyId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  contactInfo: {
    phone: string;
    email?: string;
  };
  operatingHours: {
    open: string;
    close: string;
    daysOpen: string[];
  };
  lastInventorySync: Date;
  isActive: boolean;
}

export interface MapPharmacyData {
  pharmacy: PharmacyLocation;
  inventoryItems: InventoryItem[];
  distance: number; // Distance from user location in kilometers
  estimatedDeliveryTime: number; // Estimated delivery time in minutes
  isPreferred: boolean; // Based on user preferences or past orders
}

export interface InventoryQueryRequest {
  medicationName?: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  pharmacyIds?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  includeUnavailable?: boolean;
}

export interface InventoryQueryResponse {
  items: InventoryItem[];
  totalCount: number;
  pharmacies: PharmacyLocation[];
  queryTime: Date;
}

export interface InventorySyncRequest {
  pharmacyIds?: string[];
  forceSync?: boolean;
}

export interface InventorySyncResponse {
  success: boolean;
  syncedPharmacies: string[];
  failedPharmacies: string[];
  syncTime: Date;
  message?: string;
}

export interface PharmacyHealthStatus {
  pharmacyId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorMessage?: string;
}

export interface InventoryHealthResponse {
  overallHealth: boolean;
  pharmacyStatuses: PharmacyHealthStatus[];
  lastUpdated: Date;
}

export enum InventoryStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export enum PharmacyIntegrationType {
  REST_API = 'rest_api',
  SOAP_API = 'soap_api',
  GRAPHQL_API = 'graphql_api'
}

export interface PharmacyConfig {
  pharmacyId: string;
  name: string;
  integrationType: PharmacyIntegrationType;
  apiEndpoint: string;
  apiKey?: string;
  apiSecret?: string;
  timeoutMs: number;
  retryAttempts: number;
  isActive: boolean;
  syncIntervalMinutes: number;
}