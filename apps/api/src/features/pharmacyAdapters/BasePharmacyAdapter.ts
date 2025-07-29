import { 
  InventoryItem, 
  PharmacyLocation, 
  PharmacyConfig, 
  InventoryQueryRequest,
  PharmacyHealthStatus 
} from '@pharmarx/shared-types';

export interface PharmacyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  responseTime: number;
}

export interface InventoryQueryResult {
  items: InventoryItem[];
  totalCount: number;
  queryTime: Date;
}

export interface PharmacyLocationResult {
  locations: PharmacyLocation[];
  totalCount: number;
}

export abstract class BasePharmacyAdapter {
  protected config: PharmacyConfig;

  constructor(config: PharmacyConfig) {
    this.config = config;
  }

  /**
   * Query inventory items from the pharmacy
   */
  abstract queryInventory(request: InventoryQueryRequest): Promise<PharmacyApiResponse<InventoryQueryResult>>;

  /**
   * Get pharmacy locations
   */
  abstract getLocations(): Promise<PharmacyApiResponse<PharmacyLocationResult>>;

  /**
   * Perform health check on the pharmacy API
   */
  abstract healthCheck(): Promise<PharmacyHealthStatus>;

  /**
   * Sync inventory data (if supported by the pharmacy)
   */
  abstract syncInventory(): Promise<PharmacyApiResponse<{ success: boolean; message?: string }>>;

  /**
   * Get pharmacy configuration
   */
  public getConfig(): PharmacyConfig {
    return { ...this.config };
  }

  /**
   * Validate pharmacy configuration
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiEndpoint) {
      errors.push('API endpoint is required');
    }

    if (!this.config.timeoutMs || this.config.timeoutMs <= 0) {
      errors.push('Valid timeout is required');
    }

    if (this.config.retryAttempts < 0) {
      errors.push('Retry attempts must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create standardized error response
   */
  protected createErrorResponse(error: string, responseTime: number = 0): PharmacyApiResponse<any> {
    return {
      success: false,
      error,
      responseTime
    };
  }

  /**
   * Create standardized success response
   */
  protected createSuccessResponse<T>(data: T, responseTime: number): PharmacyApiResponse<T> {
    return {
      success: true,
      data,
      responseTime
    };
  }

  /**
   * Execute API request with retry logic and timeout
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<PharmacyApiResponse<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.config.timeoutMs)
          )
        ]);

        const responseTime = Date.now() - startTime;
        return this.createSuccessResponse(result, responseTime);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const responseTime = Date.now() - startTime;
    return this.createErrorResponse(
      `Failed to execute ${operationName} after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`,
      responseTime
    );
  }

  /**
   * Transform external pharmacy data to standardized format
   */
  protected abstract transformInventoryItem(externalItem: any): InventoryItem;

  /**
   * Transform external pharmacy location to standardized format
   */
  protected abstract transformPharmacyLocation(externalLocation: any): PharmacyLocation;
}