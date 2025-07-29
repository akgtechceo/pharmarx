import { 
  PrescriptionOrder, 
  CreatePrescriptionOrderInput, 
  FileUploadResult,
  ApiResponse,
  PrescriptionOrderStatus
} from '@pharmarx/shared-types';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PrescriptionUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

class PrescriptionService {
  private readonly baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadPrescriptionFile(
    file: File, 
    options?: PrescriptionUploadOptions
  ): Promise<FileUploadResult> {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('prescription', file);
      formData.append('timestamp', Date.now().toString());

      // Create XMLHttpRequest for progress tracking
      return new Promise<FileUploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Handle progress
        if (options?.onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress: UploadProgress = {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100)
              };
              options.onProgress!(progress);
            }
          });
        }

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                url: response.url
              });
            } catch (error) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        // Handle abort
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        // Set up abort signal
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            xhr.abort();
          });
        }

        // Send request
        xhr.open('POST', `${this.baseUrl}/uploads/prescription`);
        
        // Add authorization header if available
        const token = localStorage.getItem('firebase_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Create a new prescription order
   */
  async createPrescriptionOrder(orderData: CreatePrescriptionOrderInput): Promise<PrescriptionOrder> {
    try {
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create prescription order');
      }

      return result.data;
    } catch (error) {
      console.error('Create prescription order error:', error);
      throw error;
    }
  }

  /**
   * Complete prescription upload workflow
   */
  async uploadPrescription(
    file: File,
    patientProfileId: string,
    options?: PrescriptionUploadOptions
  ): Promise<PrescriptionOrder> {
    try {
      // Step 1: Upload file to Google Cloud Storage
      const uploadResult = await this.uploadPrescriptionFile(file, options);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'File upload failed');
      }

      // Step 2: Create prescription order record
      const orderData: CreatePrescriptionOrderInput = {
        patientProfileId,
        originalImageUrl: uploadResult.url,
        status: 'pending_verification'
      };

      const prescriptionOrder = await this.createPrescriptionOrder(orderData);
      
      return prescriptionOrder;
    } catch (error) {
      console.error('Prescription upload workflow error:', error);
      throw error;
    }
  }

  /**
   * Get prescription orders for a patient
   */
  async getPrescriptionOrders(patientId: string): Promise<PrescriptionOrder[]> {
    try {
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.baseUrl}/orders?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder[]> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch prescription orders');
      }

      return result.data;
    } catch (error) {
      console.error('Get prescription orders error:', error);
      throw error;
    }
  }

  /**
   * Get prescription order by ID
   */
  async getPrescriptionOrder(orderId: string): Promise<PrescriptionOrder> {
    try {
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch prescription order');
      }

      return result.data;
    } catch (error) {
      console.error('Get prescription order error:', error);
      throw error;
    }
  }

  /**
   * Enter manual text for OCR fallback
   */
  async enterManualText(orderId: string, extractedText: string): Promise<PrescriptionOrder> {
    try {
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      if (!extractedText || !extractedText.trim()) {
        throw new Error('Extracted text is required');
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}/manual-text`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          extractedText: extractedText.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to enter manual text');
      }

      return result.data;
    } catch (error) {
      console.error('Manual text entry error:', error);
      throw error;
    }
  }

  /**
   * Update prescription order status using the pharmacist endpoint
   */
  async updateOrderStatus(
    orderId: string, 
    status: PrescriptionOrderStatus
  ): Promise<PrescriptionOrder> {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update order status');
      }

      return result.data;
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * Update prescription order status
   */
  async updatePrescriptionOrderStatus(
    orderId: string, 
    status: string
  ): Promise<PrescriptionOrder> {
    try {
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update prescription order');
      }

      return result.data;
    } catch (error) {
      console.error('Update prescription order error:', error);
      throw error;
    }
  }

  /**
   * Get user-friendly error message based on HTTP status code
   */
  private getStatusErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request data';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict. The resource already exists or is in use.';
      case 422:
        return 'Invalid data provided. Please check your input and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Request failed with status ${status}`;
    }
  }
}

export const prescriptionService = new PrescriptionService(); 