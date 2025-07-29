import { 
  PatientSearchRequest, 
  PatientSearchResult, 
  CreateDoctorPrescriptionInput,
  DoctorPrescriptionSubmission,
  DoctorPrescriptionHistoryResponse,
  ApiResponse
} from '@pharmarx/shared-types';
import { auth } from '../../auth/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class DoctorPrescriptionService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async searchPatients(request: PatientSearchRequest): Promise<PatientSearchResult[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams({
        query: request.query,
        searchType: request.searchType,
        ...(request.limit && { limit: request.limit.toString() })
      });

      const response = await fetch(`${API_BASE_URL}/doctor/patients?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search patients');
      }

      const data: ApiResponse<PatientSearchResult[]> = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching patients:', error);
      throw error;
    }
  }

  async submitPrescription(input: CreateDoctorPrescriptionInput): Promise<DoctorPrescriptionSubmission> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/doctor/prescriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit prescription');
      }

      const data: ApiResponse<DoctorPrescriptionSubmission> = await response.json();
      return data.data!;
    } catch (error) {
      console.error('Error submitting prescription:', error);
      throw error;
    }
  }

  async getPrescriptionHistory(page: number = 1, limit: number = 10): Promise<DoctorPrescriptionHistoryResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${API_BASE_URL}/doctor/prescriptions?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get prescription history');
      }

      const data: ApiResponse<DoctorPrescriptionHistoryResponse> = await response.json();
      return data.data!;
    } catch (error) {
      console.error('Error getting prescription history:', error);
      throw error;
    }
  }
}

export const doctorPrescriptionService = new DoctorPrescriptionService();