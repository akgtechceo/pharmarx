import { 
  PrescriptionOrder, 
  CreatePrescriptionOrderInput, 
  FileUploadResult,
  ApiResponse,
  PrescriptionOrderStatus
} from '@pharmarx/shared-types';
import { useAuthStore } from '../stores/authStore';
import { getValidAuthToken, handleAuthError } from '../utils/authUtils';

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
  private readonly useMockMode = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

  /**
   * Get authentication token from auth store
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await getValidAuthToken();
    } catch (error) {
      console.error('Failed to get valid auth token:', error);
      if (error instanceof Error) {
        handleAuthError(error);
      }
      return null;
    }
  }

  /**
   * Get authentication token with error handling
   */
  private async getAuthTokenOrThrow(): Promise<string> {
    const token = await this.getAuthToken();
    if (!token) {
      // Check if user is authenticated but token is missing
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.user) {
        throw new Error('Authentication token expired. Please refresh the page and try again.');
      } else {
        throw new Error('Authentication token not found. Please log in again.');
      }
    }
    return token;
  }

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadPrescriptionFile(
    file: File, 
    options?: PrescriptionUploadOptions
  ): Promise<FileUploadResult> {
    // Use mock mode if API is not available
    if (this.useMockMode) {
      return this.mockFileUpload(file, options);
    }

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
        this.getAuthToken().then(token => {
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.send(formData);
        }).catch(error => {
          console.warn('Failed to get auth token for upload:', error);
          xhr.send(formData);
        });
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
    // Use mock mode if API is not available
    if (this.useMockMode) {
      return this.mockCreatePrescriptionOrder(orderData);
    }

    try {
      const token = await this.getAuthTokenOrThrow();

      const response = await fetch(`${this.baseUrl}/api/orders`, {
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
      const token = await this.getAuthTokenOrThrow();

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
    // Use mock mode if API is not available
    if (this.useMockMode) {
      return this.mockGetPrescriptionOrder(orderId);
    }

    try {
      const token = await this.getAuthTokenOrThrow();

      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}`, {
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
   * Get prescription order by ID (alias for getPrescriptionOrder)
   */
  async getOrder(orderId: string): Promise<ApiResponse<PrescriptionOrder>> {
    try {
      const order = await this.getPrescriptionOrder(orderId);
      return {
        success: true,
        data: order
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order'
      };
    }
  }

  /**
   * Update order with OCR results
   */
  async updateOrderWithOCRResults(
    orderId: string, 
    data: {
      useOCR: boolean;
      extractedText?: string;
      medicationDetails?: any;
    }
  ): Promise<ApiResponse<PrescriptionOrder>> {
    try {
      const token = await this.getAuthTokenOrThrow();

      const response = await fetch(`${this.baseUrl}/orders/${orderId}/ocr-review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || this.getStatusErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<PrescriptionOrder> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update order with OCR results');
      }

      return result;
    } catch (error) {
      console.error('Update order with OCR results error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order with OCR results'
      };
    }
  }

  /**
   * Enter manual text for OCR fallback
   */
  async enterManualText(orderId: string, extractedText: string): Promise<PrescriptionOrder> {
    try {
      const token = await this.getAuthTokenOrThrow();

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
      const token = await this.getAuthTokenOrThrow();

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
      const token = await this.getAuthTokenOrThrow();

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

  /**
   * Mock file upload for development
   */
  private async mockFileUpload(file: File, options?: PrescriptionUploadOptions): Promise<FileUploadResult> {
    // Simulate upload progress
    if (options?.onProgress) {
      const total = file.size;
      let loaded = 0;
      const interval = setInterval(() => {
        loaded += total / 10;
        if (loaded >= total) {
          loaded = total;
          clearInterval(interval);
        }
        options.onProgress!({
          loaded: Math.floor(loaded),
          total,
          percentage: Math.round((loaded / total) * 100)
        });
      }, 100);
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Convert file to data URL for mock mode
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      success: true,
      url: dataUrl
    };
  }

  /**
   * Mock create prescription order for development
   */
  private async mockCreatePrescriptionOrder(orderData: CreatePrescriptionOrderInput): Promise<PrescriptionOrder> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockOrder: PrescriptionOrder = {
      orderId: `mock-order-${Date.now()}`,
      patientProfileId: orderData.patientProfileId,
      status: 'pending_verification',
      originalImageUrl: orderData.originalImageUrl,
      ocrStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      extractedText: undefined,
      ocrConfidence: undefined,
      ocrProcessedAt: undefined,
      ocrError: undefined,
      medicationDetails: undefined,
      userVerified: undefined,
      userVerificationNotes: undefined,
      pharmacistReview: undefined,
      cost: undefined
    };

    return mockOrder;
  }

  /**
   * Mock get prescription order for development
   */
  private async mockGetPrescriptionOrder(orderId: string): Promise<PrescriptionOrder> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Store mock orders in memory for consistency
    if (!this.mockOrders) {
      this.mockOrders = new Map<string, PrescriptionOrder>();
    }

    // Return existing mock order or create a new one
    let mockOrder = this.mockOrders.get(orderId);
    
    if (!mockOrder) {
      // Create a mock order with simulated OCR progress
      const ocrStatuses = ['pending', 'processing', 'completed'];
      const randomStatus = ocrStatuses[Math.floor(Math.random() * ocrStatuses.length)];
      
      mockOrder = {
        orderId,
        patientProfileId: `mock-patient-${Date.now()}`,
        status: 'pending_verification',
        originalImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        ocrStatus: randomStatus as 'pending' | 'processing' | 'completed' | 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
        extractedText: randomStatus === 'completed' ? 'Mock prescription text\nMedication: Test Medicine\nDosage: 100mg\nQuantity: 30' : undefined,
        ocrConfidence: randomStatus === 'completed' ? 0.95 : undefined,
        ocrProcessedAt: randomStatus === 'completed' ? new Date() : undefined,
        medicationDetails: randomStatus === 'completed' ? {
          name: 'Test Medicine',
          dosage: '100mg',
          quantity: 30
        } : undefined,
        userVerified: undefined,
        userVerificationNotes: undefined,
        pharmacistReview: undefined,
        cost: undefined
      };
      
      this.mockOrders.set(orderId, mockOrder);
    }

    // Simulate OCR progress
    if (mockOrder.ocrStatus === 'pending') {
      mockOrder.ocrStatus = 'processing';
      mockOrder.updatedAt = new Date();
    } else if (mockOrder.ocrStatus === 'processing' && Math.random() > 0.3) {
      mockOrder.ocrStatus = 'completed';
      mockOrder.extractedText = 'Mock prescription text\nMedication: Test Medicine\nDosage: 100mg\nQuantity: 30';
      mockOrder.ocrConfidence = 0.95;
      mockOrder.ocrProcessedAt = new Date();
      mockOrder.medicationDetails = {
        name: 'Test Medicine',
        dosage: '100mg',
        quantity: 30
      };
      mockOrder.updatedAt = new Date();
    }

    return mockOrder;
  }

  private mockOrders?: Map<string, PrescriptionOrder>;
}

export const prescriptionService = new PrescriptionService(); 