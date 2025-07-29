import { 
  InventoryItem, 
  PharmacyLocation, 
  PharmacyConfig, 
  InventoryQueryRequest,
  PharmacyHealthStatus 
} from '@pharmarx/shared-types';
import { BasePharmacyAdapter, PharmacyApiResponse, InventoryQueryResult, PharmacyLocationResult } from './BasePharmacyAdapter';

interface ExternalInventoryItem {
  id: string;
  name: string;
  generic_name?: string;
  dosage: string;
  form: string;
  strength: string;
  stock_quantity: number;
  unit: string;
  price: number;
  currency: string;
  last_updated: string;
  available: boolean;
  expiry_date?: string;
}

interface ExternalPharmacyLocation {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  contact: {
    phone: string;
    email?: string;
  };
  hours: {
    open: string;
    close: string;
    days: string[];
  };
  last_sync: string;
  active: boolean;
}

interface ExternalInventoryResponse {
  items: ExternalInventoryItem[];
  total_count: number;
  query_time: string;
}

interface ExternalLocationResponse {
  locations: ExternalPharmacyLocation[];
  total_count: number;
}

export class RestApiPharmacyAdapter extends BasePharmacyAdapter {
  
  async queryInventory(request: InventoryQueryRequest): Promise<PharmacyApiResponse<InventoryQueryResult>> {
    return this.executeWithRetry(async () => {
      const queryParams = new URLSearchParams();
      
      if (request.medicationName) {
        queryParams.append('medication_name', request.medicationName);
      }
      if (request.genericName) {
        queryParams.append('generic_name', request.genericName);
      }
      if (request.dosage) {
        queryParams.append('dosage', request.dosage);
      }
      if (request.form) {
        queryParams.append('form', request.form);
      }
      if (request.includeUnavailable !== undefined) {
        queryParams.append('include_unavailable', request.includeUnavailable.toString());
      }

      const url = `${this.config.apiEndpoint}/inventory?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ExternalInventoryResponse = await response.json();
      
      return {
        items: data.items.map(item => this.transformInventoryItem(item)),
        totalCount: data.total_count,
        queryTime: new Date(data.query_time)
      };
    }, 'queryInventory');
  }

  async getLocations(): Promise<PharmacyApiResponse<PharmacyLocationResult>> {
    return this.executeWithRetry(async () => {
      const url = `${this.config.apiEndpoint}/locations`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ExternalLocationResponse = await response.json();
      
      return {
        locations: data.locations.map(location => this.transformPharmacyLocation(location)),
        totalCount: data.total_count
      };
    }, 'getLocations');
  }

  async healthCheck(): Promise<PharmacyHealthStatus> {
    const startTime = Date.now();
    
    try {
      const url = `${this.config.apiEndpoint}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          pharmacyId: this.config.pharmacyId,
          isHealthy: false,
          lastCheck: new Date(),
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        pharmacyId: this.config.pharmacyId,
        isHealthy: true,
        lastCheck: new Date(),
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        pharmacyId: this.config.pharmacyId,
        isHealthy: false,
        lastCheck: new Date(),
        responseTime,
        errorMessage: (error as Error).message
      };
    }
  }

  async syncInventory(): Promise<PharmacyApiResponse<{ success: boolean; message?: string }>> {
    return this.executeWithRetry(async () => {
      const url = `${this.config.apiEndpoint}/sync`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: data.success || false,
        message: data.message
      };
    }, 'syncInventory');
  }

  protected transformInventoryItem(externalItem: ExternalInventoryItem): InventoryItem {
    return {
      itemId: externalItem.id,
      pharmacyId: this.config.pharmacyId,
      medicationName: externalItem.name,
      genericName: externalItem.generic_name,
      dosage: externalItem.dosage,
      form: this.mapForm(externalItem.form),
      strength: externalItem.strength,
      quantity: externalItem.stock_quantity,
      unit: this.mapUnit(externalItem.unit),
      price: externalItem.price,
      currency: externalItem.currency,
      lastUpdated: new Date(externalItem.last_updated),
      isAvailable: externalItem.available,
      expiryDate: externalItem.expiry_date ? new Date(externalItem.expiry_date) : undefined
    };
  }

  protected transformPharmacyLocation(externalLocation: ExternalPharmacyLocation): PharmacyLocation {
    return {
      pharmacyId: externalLocation.id,
      name: externalLocation.name,
      address: {
        street: externalLocation.address.street,
        city: externalLocation.address.city,
        state: externalLocation.address.state,
        postalCode: externalLocation.address.postal_code,
        country: externalLocation.address.country
      },
      coordinates: {
        latitude: externalLocation.coordinates.lat,
        longitude: externalLocation.coordinates.lng
      },
      contactInfo: {
        phone: externalLocation.contact.phone,
        email: externalLocation.contact.email
      },
      operatingHours: {
        open: externalLocation.hours.open,
        close: externalLocation.hours.close,
        daysOpen: externalLocation.hours.days
      },
      lastInventorySync: new Date(externalLocation.last_sync),
      isActive: externalLocation.active
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.config.apiSecret) {
      headers['X-API-Secret'] = this.config.apiSecret;
    }

    return headers;
  }

  private mapForm(externalForm: string): InventoryItem['form'] {
    const formMap: Record<string, InventoryItem['form']> = {
      'tablet': 'tablet',
      'capsule': 'capsule',
      'liquid': 'liquid',
      'injection': 'injection',
      'cream': 'cream',
      'ointment': 'cream',
      'suspension': 'liquid',
      'solution': 'liquid'
    };

    return formMap[externalForm.toLowerCase()] || 'other';
  }

  private mapUnit(externalUnit: string): InventoryItem['unit'] {
    const unitMap: Record<string, InventoryItem['unit']> = {
      'tablets': 'tablets',
      'capsules': 'capsules',
      'bottles': 'bottles',
      'tubes': 'tubes',
      'vials': 'vials',
      'units': 'units',
      'pills': 'tablets',
      'tablet': 'tablets',
      'capsule': 'capsules',
      'bottle': 'bottles',
      'tube': 'tubes',
      'vial': 'vials',
      'unit': 'units'
    };

    return unitMap[externalUnit.toLowerCase()] || 'units';
  }
}