import { 
  InventoryItem, 
  PharmacyLocation, 
  InventoryQueryRequest, 
  InventoryQueryResponse,
  InventorySyncRequest,
  InventorySyncResponse,
  InventoryHealthResponse,
  PharmacyHealthStatus,
  PharmacyConfig,
  PharmacyIntegrationType
} from '@pharmarx/shared-types';
import { InventoryConfigManager } from '../config/inventoryConfig';
import { BasePharmacyAdapter } from './pharmacyAdapters/BasePharmacyAdapter';
import { RestApiPharmacyAdapter } from './pharmacyAdapters/RestApiPharmacyAdapter';

export class InventoryService {
  private configManager: InventoryConfigManager;
  private adapters: Map<string, BasePharmacyAdapter>;

  constructor() {
    this.configManager = InventoryConfigManager.getInstance();
    this.adapters = new Map();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    const pharmacyConfigs = this.configManager.getActivePharmacyConfigs();
    
    pharmacyConfigs.forEach(config => {
      const adapter = this.createAdapter(config);
      if (adapter) {
        this.adapters.set(config.pharmacyId, adapter);
      }
    });
  }

  private createAdapter(config: PharmacyConfig): BasePharmacyAdapter | null {
    switch (config.integrationType) {
      case PharmacyIntegrationType.REST_API:
        return new RestApiPharmacyAdapter(config);
      // Add other adapter types as needed
      default:
        console.warn(`Unsupported integration type: ${config.integrationType} for pharmacy ${config.pharmacyId}`);
        return null;
    }
  }

  /**
   * Query inventory across all active pharmacies
   */
  async queryInventory(request: InventoryQueryRequest): Promise<InventoryQueryResponse> {
    const allItems: InventoryItem[] = [];
    const allPharmacies: PharmacyLocation[] = [];
    const errors: string[] = [];

    // Query each pharmacy in parallel
    const queryPromises = Array.from(this.adapters.entries()).map(async ([pharmacyId, adapter]) => {
      try {
        const result = await adapter.queryInventory(request);
        
        if (result.success && result.data) {
          allItems.push(...result.data.items);
          
          // Get pharmacy locations if not already included
          const locationResult = await adapter.getLocations();
          if (locationResult.success && locationResult.data) {
            allPharmacies.push(...locationResult.data.locations);
          }
        } else {
          errors.push(`Pharmacy ${pharmacyId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Pharmacy ${pharmacyId}: ${(error as Error).message}`);
      }
    });

    await Promise.all(queryPromises);

    // Filter items based on request criteria
    let filteredItems = allItems;

    if (request.pharmacyIds && request.pharmacyIds.length > 0) {
      filteredItems = filteredItems.filter(item => 
        request.pharmacyIds!.includes(item.pharmacyId)
      );
    }

    if (request.location) {
      filteredItems = filteredItems.filter(item => {
        const pharmacy = allPharmacies.find(p => p.pharmacyId === item.pharmacyId);
        if (!pharmacy) return false;

        const distance = this.calculateDistance(
          request.location!.latitude,
          request.location!.longitude,
          pharmacy.coordinates.latitude,
          pharmacy.coordinates.longitude
        );

        return distance <= request.location!.radiusKm;
      });
    }

    if (!request.includeUnavailable) {
      filteredItems = filteredItems.filter(item => item.isAvailable);
    }

    return {
      items: filteredItems,
      totalCount: filteredItems.length,
      pharmacies: allPharmacies,
      queryTime: new Date()
    };
  }

  /**
   * Get all pharmacy locations
   */
  async getPharmacyLocations(): Promise<PharmacyLocation[]> {
    const allLocations: PharmacyLocation[] = [];
    const errors: string[] = [];

    const locationPromises = Array.from(this.adapters.entries()).map(async ([pharmacyId, adapter]) => {
      try {
        const result = await adapter.getLocations();
        
        if (result.success && result.data) {
          allLocations.push(...result.data.locations);
        } else {
          errors.push(`Pharmacy ${pharmacyId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Pharmacy ${pharmacyId}: ${(error as Error).message}`);
      }
    });

    await Promise.all(locationPromises);

    if (errors.length > 0) {
      console.warn('Errors fetching pharmacy locations:', errors);
    }

    return allLocations;
  }

  /**
   * Sync inventory for specified pharmacies
   */
  async syncInventory(request: InventorySyncRequest): Promise<InventorySyncResponse> {
    const syncedPharmacies: string[] = [];
    const failedPharmacies: string[] = [];
    const errors: string[] = [];

    const targetPharmacies = request.pharmacyIds || Array.from(this.adapters.keys());

    const syncPromises = targetPharmacies.map(async (pharmacyId) => {
      const adapter = this.adapters.get(pharmacyId);
      if (!adapter) {
        failedPharmacies.push(pharmacyId);
        errors.push(`Pharmacy ${pharmacyId}: Adapter not found`);
        return;
      }

      try {
        const result = await adapter.syncInventory();
        
        if (result.success) {
          syncedPharmacies.push(pharmacyId);
        } else {
          failedPharmacies.push(pharmacyId);
          errors.push(`Pharmacy ${pharmacyId}: ${result.error}`);
        }
      } catch (error) {
        failedPharmacies.push(pharmacyId);
        errors.push(`Pharmacy ${pharmacyId}: ${(error as Error).message}`);
      }
    });

    await Promise.all(syncPromises);

    return {
      success: failedPharmacies.length === 0,
      syncedPharmacies,
      failedPharmacies,
      syncTime: new Date(),
      message: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Check health status of all pharmacy integrations
   */
  async checkHealth(): Promise<InventoryHealthResponse> {
    const pharmacyStatuses: PharmacyHealthStatus[] = [];
    const errors: string[] = [];

    const healthPromises = Array.from(this.adapters.entries()).map(async ([pharmacyId, adapter]) => {
      try {
        const status = await adapter.healthCheck();
        pharmacyStatuses.push(status);
        
        if (!status.isHealthy) {
          errors.push(`Pharmacy ${pharmacyId}: ${status.errorMessage}`);
        }
      } catch (error) {
        const errorStatus: PharmacyHealthStatus = {
          pharmacyId,
          isHealthy: false,
          lastCheck: new Date(),
          responseTime: 0,
          errorMessage: (error as Error).message
        };
        pharmacyStatuses.push(errorStatus);
        errors.push(`Pharmacy ${pharmacyId}: ${(error as Error).message}`);
      }
    });

    await Promise.all(healthPromises);

    const overallHealth = errors.length === 0;

    return {
      overallHealth,
      pharmacyStatuses,
      lastUpdated: new Date()
    };
  }

  /**
   * Get inventory configuration
   */
  getConfig() {
    return this.configManager.getConfig();
  }

  /**
   * Get pharmacy configuration
   */
  getPharmacyConfig(pharmacyId: string) {
    return this.configManager.getPharmacyConfig(pharmacyId);
  }

  /**
   * Get all pharmacy configurations
   */
  getAllPharmacyConfigs() {
    return this.configManager.getAllPharmacyConfigs();
  }

  /**
   * Add or update pharmacy configuration
   */
  updatePharmacyConfig(config: PharmacyConfig): boolean {
    const validation = this.configManager.validatePharmacyConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid pharmacy config: ${validation.errors.join(', ')}`);
    }

    this.configManager.addPharmacyConfig(config);
    
    // Update or create adapter
    const adapter = this.createAdapter(config);
    if (adapter) {
      this.adapters.set(config.pharmacyId, adapter);
      return true;
    }
    
    return false;
  }

  /**
   * Remove pharmacy configuration
   */
  removePharmacyConfig(pharmacyId: string): boolean {
    this.adapters.delete(pharmacyId);
    return this.configManager.removePharmacyConfig(pharmacyId);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}