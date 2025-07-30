import { PrescriptionOrder } from '@pharmarx/shared-types';

export interface PharmacySelectionRequest {
  orderId: string;
  pharmacyId: string;
  patientId: string;
}

export interface PharmacySelectionResponse {
  success: boolean;
  order: PrescriptionOrder;
  message?: string;
  error?: string;
}

class PharmacySelectionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/pharmarx-dev/us-central1/api';
  }

  /**
   * Update an order with the selected pharmacy
   */
  async selectPharmacy(request: PharmacySelectionRequest): Promise<PharmacySelectionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${request.orderId}/pharmacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          pharmacyId: request.pharmacyId,
          patientId: request.patientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to select pharmacy: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        order: data.order,
        message: 'Pharmacy selected successfully'
      };
    } catch (error) {
      console.error('Pharmacy selection error:', error);
      return {
        success: false,
        order: {} as PrescriptionOrder,
        error: error instanceof Error ? error.message : 'Failed to select pharmacy'
      };
    }
  }

  /**
   * Get pharmacy details for a specific pharmacy ID
   */
  async getPharmacyDetails(pharmacyId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/pharmacies/${pharmacyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pharmacy details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get pharmacy details error:', error);
      throw error;
    }
  }

  /**
   * Get user's preferred pharmacies
   */
  async getPreferredPharmacies(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/preferred-pharmacies`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preferred pharmacies: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get preferred pharmacies error:', error);
      return [];
    }
  }

  /**
   * Save a pharmacy as preferred for the user
   */
  async savePreferredPharmacy(userId: string, pharmacyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/preferred-pharmacies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ pharmacyId })
      });

      return response.ok;
    } catch (error) {
      console.error('Save preferred pharmacy error:', error);
      return false;
    }
  }

  /**
   * Get order details with pharmacy information
   */
  async getOrderWithPharmacy(orderId: string): Promise<PrescriptionOrder | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get order error:', error);
      return null;
    }
  }

  /**
   * Validate if a pharmacy can fulfill the order
   */
  async validatePharmacyForOrder(orderId: string, pharmacyId: string): Promise<{
    canFulfill: boolean;
    reason?: string;
    estimatedDeliveryTime?: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/validate-pharmacy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ pharmacyId })
      });

      if (!response.ok) {
        throw new Error(`Failed to validate pharmacy: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Validate pharmacy error:', error);
      return {
        canFulfill: false,
        reason: 'Unable to validate pharmacy at this time'
      };
    }
  }

  private getAuthToken(): string {
    // Get auth token from your auth store or localStorage
    // This is a placeholder - implement based on your auth system
    return localStorage.getItem('authToken') || '';
  }
}

export const pharmacySelectionService = new PharmacySelectionService();