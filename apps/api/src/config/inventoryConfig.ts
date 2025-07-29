import { PharmacyConfig, PharmacyIntegrationType } from '@pharmarx/shared-types';

export interface InventoryConfig {
  defaultTimeoutMs: number;
  defaultRetryAttempts: number;
  defaultSyncIntervalMinutes: number;
  maxConcurrentSyncs: number;
  healthCheckIntervalMinutes: number;
}

export class InventoryConfigManager {
  private static instance: InventoryConfigManager;
  private config: InventoryConfig;
  private pharmacyConfigs: Map<string, PharmacyConfig>;

  private constructor() {
    this.config = {
      defaultTimeoutMs: 30000, // 30 seconds
      defaultRetryAttempts: 3,
      defaultSyncIntervalMinutes: 15,
      maxConcurrentSyncs: 5,
      healthCheckIntervalMinutes: 5
    };

    this.pharmacyConfigs = new Map();
    this.initializeDefaultConfigs();
  }

  public static getInstance(): InventoryConfigManager {
    if (!InventoryConfigManager.instance) {
      InventoryConfigManager.instance = new InventoryConfigManager();
    }
    return InventoryConfigManager.instance;
  }

  private initializeDefaultConfigs(): void {
    // Example pharmacy configurations - these would typically come from environment variables or database
    const defaultPharmacies: PharmacyConfig[] = [
      {
        pharmacyId: 'pharmacy-001',
        name: 'Central Pharmacy',
        integrationType: PharmacyIntegrationType.REST_API,
        apiEndpoint: process.env.CENTRAL_PHARMACY_API_ENDPOINT || 'https://api.centralpharmacy.com/inventory',
        apiKey: process.env.CENTRAL_PHARMACY_API_KEY,
        apiSecret: process.env.CENTRAL_PHARMACY_API_SECRET,
        timeoutMs: 30000,
        retryAttempts: 3,
        isActive: true,
        syncIntervalMinutes: 15
      },
      {
        pharmacyId: 'pharmacy-002',
        name: 'Community Drug Store',
        integrationType: PharmacyIntegrationType.REST_API,
        apiEndpoint: process.env.COMMUNITY_PHARMACY_API_ENDPOINT || 'https://api.communitydrugstore.com/stock',
        apiKey: process.env.COMMUNITY_PHARMACY_API_KEY,
        apiSecret: process.env.COMMUNITY_PHARMACY_API_SECRET,
        timeoutMs: 25000,
        retryAttempts: 2,
        isActive: true,
        syncIntervalMinutes: 20
      }
    ];

    defaultPharmacies.forEach(pharmacy => {
      this.pharmacyConfigs.set(pharmacy.pharmacyId, pharmacy);
    });
  }

  public getConfig(): InventoryConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<InventoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getPharmacyConfig(pharmacyId: string): PharmacyConfig | undefined {
    return this.pharmacyConfigs.get(pharmacyId);
  }

  public getAllPharmacyConfigs(): PharmacyConfig[] {
    return Array.from(this.pharmacyConfigs.values());
  }

  public getActivePharmacyConfigs(): PharmacyConfig[] {
    return Array.from(this.pharmacyConfigs.values()).filter(config => config.isActive);
  }

  public addPharmacyConfig(config: PharmacyConfig): void {
    this.pharmacyConfigs.set(config.pharmacyId, config);
  }

  public updatePharmacyConfig(pharmacyId: string, updates: Partial<PharmacyConfig>): boolean {
    const existingConfig = this.pharmacyConfigs.get(pharmacyId);
    if (!existingConfig) {
      return false;
    }

    this.pharmacyConfigs.set(pharmacyId, { ...existingConfig, ...updates });
    return true;
  }

  public removePharmacyConfig(pharmacyId: string): boolean {
    return this.pharmacyConfigs.delete(pharmacyId);
  }

  public validatePharmacyConfig(config: PharmacyConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pharmacyId || config.pharmacyId.trim() === '') {
      errors.push('pharmacyId is required');
    }

    if (!config.name || config.name.trim() === '') {
      errors.push('name is required');
    }

    if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
      errors.push('apiEndpoint is required');
    } else {
      try {
        new URL(config.apiEndpoint);
      } catch {
        errors.push('apiEndpoint must be a valid URL');
      }
    }

    if (config.timeoutMs <= 0) {
      errors.push('timeoutMs must be greater than 0');
    }

    if (config.retryAttempts < 0) {
      errors.push('retryAttempts must be non-negative');
    }

    if (config.syncIntervalMinutes <= 0) {
      errors.push('syncIntervalMinutes must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public getPharmacyIds(): string[] {
    return Array.from(this.pharmacyConfigs.keys());
  }

  public isPharmacyActive(pharmacyId: string): boolean {
    const config = this.pharmacyConfigs.get(pharmacyId);
    return config?.isActive ?? false;
  }
}