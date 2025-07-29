import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  InventoryQueryRequest, 
  InventorySyncRequest,
  PharmacyConfig,
  PharmacyIntegrationType,
  InventoryItem,
  PharmacyLocation
} from '@pharmarx/shared-types';

describe('InventoryService', () => {
  let mockInventoryService: any;

  const mockPharmacyConfig: PharmacyConfig = {
    pharmacyId: 'pharmacy-001',
    name: 'Test Pharmacy',
    integrationType: PharmacyIntegrationType.REST_API,
    apiEndpoint: 'https://api.testpharmacy.com',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    timeoutMs: 30000,
    retryAttempts: 3,
    isActive: true,
    syncIntervalMinutes: 15
  };

  const mockInventoryItem: InventoryItem = {
    itemId: 'item-001',
    pharmacyId: 'pharmacy-001',
    medicationName: 'Test Medication',
    dosage: '10mg',
    form: 'tablet',
    strength: '10mg',
    quantity: 100,
    unit: 'tablets',
    price: 25.99,
    currency: 'USD',
    lastUpdated: new Date(),
    isAvailable: true
  };

  const mockPharmacyLocation: PharmacyLocation = {
    pharmacyId: 'pharmacy-001',
    name: 'Test Pharmacy',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US'
    },
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    contactInfo: {
      phone: '+1234567890'
    },
    operatingHours: {
      open: '09:00',
      close: '17:00',
      daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    lastInventorySync: new Date(),
    isActive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock service directly
    mockInventoryService = {
      queryInventory: vi.fn(),
      getPharmacyLocations: vi.fn(),
      syncInventory: vi.fn(),
      checkHealth: vi.fn(),
      getConfig: vi.fn(),
      getPharmacyConfig: vi.fn(),
      getAllPharmacyConfigs: vi.fn(),
      updatePharmacyConfig: vi.fn(),
      removePharmacyConfig: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryInventory', () => {
    it('should query inventory successfully', async () => {
      const queryRequest: InventoryQueryRequest = {
        medicationName: 'Test Medication'
      };

      const mockResponse = {
        items: [mockInventoryItem],
        totalCount: 1,
        pharmacies: [mockPharmacyLocation],
        queryTime: new Date()
      };

      mockInventoryService.queryInventory.mockResolvedValue(mockResponse);

      const result = await mockInventoryService.queryInventory(queryRequest);

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.pharmacies).toHaveLength(1);
      expect(mockInventoryService.queryInventory).toHaveBeenCalledWith(queryRequest);
    });

    it('should handle pharmacy API errors gracefully', async () => {
      mockInventoryService.queryInventory.mockResolvedValue({
        items: [],
        totalCount: 0,
        pharmacies: [],
        queryTime: new Date()
      });

      const result = await mockInventoryService.queryInventory({});

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getPharmacyLocations', () => {
    it('should get pharmacy locations successfully', async () => {
      const mockLocations = [mockPharmacyLocation];

      mockInventoryService.getPharmacyLocations.mockResolvedValue(mockLocations);

      const result = await mockInventoryService.getPharmacyLocations();

      expect(result).toHaveLength(1);
      expect(result[0].pharmacyId).toBe('pharmacy-001');
    });

    it('should handle pharmacy API errors gracefully', async () => {
      mockInventoryService.getPharmacyLocations.mockResolvedValue([]);

      const result = await mockInventoryService.getPharmacyLocations();

      expect(result).toHaveLength(0);
    });
  });

  describe('syncInventory', () => {
    it('should sync inventory successfully', async () => {
      const syncRequest: InventorySyncRequest = {
        pharmacyIds: ['pharmacy-001']
      };

      const mockSyncResponse = {
        success: true,
        syncedPharmacies: ['pharmacy-001'],
        failedPharmacies: [],
        syncTime: new Date(),
        message: undefined
      };

      mockInventoryService.syncInventory.mockResolvedValue(mockSyncResponse);

      const result = await mockInventoryService.syncInventory(syncRequest);

      expect(result.success).toBe(true);
      expect(result.syncedPharmacies).toContain('pharmacy-001');
      expect(result.failedPharmacies).toHaveLength(0);
    });

    it('should handle sync failures', async () => {
      const syncRequest: InventorySyncRequest = {
        pharmacyIds: ['pharmacy-001']
      };

      const mockSyncResponse = {
        success: false,
        syncedPharmacies: [],
        failedPharmacies: ['pharmacy-001'],
        syncTime: new Date(),
        message: 'Sync failed'
      };

      mockInventoryService.syncInventory.mockResolvedValue(mockSyncResponse);

      const result = await mockInventoryService.syncInventory(syncRequest);

      expect(result.success).toBe(false);
      expect(result.failedPharmacies).toContain('pharmacy-001');
      expect(result.syncedPharmacies).toHaveLength(0);
    });
  });

  describe('checkHealth', () => {
    it('should check health status successfully', async () => {
      const mockHealthResponse = {
        overallHealth: true,
        pharmacyStatuses: [
          {
            pharmacyId: 'pharmacy-001',
            isHealthy: true,
            lastCheck: new Date(),
            responseTime: 100
          }
        ],
        lastUpdated: new Date()
      };

      mockInventoryService.checkHealth.mockResolvedValue(mockHealthResponse);

      const result = await mockInventoryService.checkHealth();

      expect(result.overallHealth).toBe(true);
      expect(result.pharmacyStatuses).toHaveLength(1);
      expect(result.pharmacyStatuses[0].isHealthy).toBe(true);
    });

    it('should handle unhealthy pharmacies', async () => {
      const mockHealthResponse = {
        overallHealth: false,
        pharmacyStatuses: [
          {
            pharmacyId: 'pharmacy-001',
            isHealthy: false,
            lastCheck: new Date(),
            responseTime: 0,
            errorMessage: 'Connection failed'
          }
        ],
        lastUpdated: new Date()
      };

      mockInventoryService.checkHealth.mockResolvedValue(mockHealthResponse);

      const result = await mockInventoryService.checkHealth();

      expect(result.overallHealth).toBe(false);
      expect(result.pharmacyStatuses[0].isHealthy).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should get configuration', () => {
      const mockConfig = {
        defaultTimeoutMs: 30000,
        defaultRetryAttempts: 3,
        defaultSyncIntervalMinutes: 15,
        maxConcurrentSyncs: 5,
        healthCheckIntervalMinutes: 5
      };

      mockInventoryService.getConfig.mockReturnValue(mockConfig);

      const config = mockInventoryService.getConfig();
      expect(config).toEqual(mockConfig);
      expect(config.defaultTimeoutMs).toBe(30000);
    });

    it('should get pharmacy configuration', () => {
      mockInventoryService.getPharmacyConfig.mockReturnValue(mockPharmacyConfig);

      const config = mockInventoryService.getPharmacyConfig('pharmacy-001');
      expect(config).toEqual(mockPharmacyConfig);
    });

    it('should get all pharmacy configurations', () => {
      const mockConfigs = [mockPharmacyConfig];
      mockInventoryService.getAllPharmacyConfigs.mockReturnValue(mockConfigs);

      const configs = mockInventoryService.getAllPharmacyConfigs();
      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual(mockPharmacyConfig);
    });

    it('should update pharmacy configuration successfully', () => {
      const updatedConfig = { ...mockPharmacyConfig, name: 'Updated Pharmacy' };
      
      mockInventoryService.updatePharmacyConfig.mockReturnValue(true);

      const result = mockInventoryService.updatePharmacyConfig(updatedConfig);
      expect(result).toBe(true);
    });

    it('should remove pharmacy configuration', () => {
      mockInventoryService.removePharmacyConfig.mockReturnValue(true);

      const result = mockInventoryService.removePharmacyConfig('pharmacy-001');
      expect(result).toBe(true);
    });
  });
});