import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import inventoryRoutes from './inventoryRoutes';
import { UserRole } from '@pharmarx/shared-types';

// Mock the InventoryService
vi.mock('./inventoryService', () => ({
  InventoryService: vi.fn().mockImplementation(() => ({
    queryInventory: vi.fn(),
    getPharmacyLocations: vi.fn(),
    syncInventory: vi.fn(),
    checkHealth: vi.fn(),
    getConfig: vi.fn(),
    getAllPharmacyConfigs: vi.fn(),
    updatePharmacyConfig: vi.fn(),
    removePharmacyConfig: vi.fn(),
    getPharmacyConfig: vi.fn()
  }))
}));

describe('Inventory Routes', () => {
  let app: express.Application;
  let mockInventoryService: any;

  const mockPharmacistUser = {
    uid: 'pharmacist-001',
    role: UserRole.Pharmacist,
    email: 'pharmacist@test.com',
    displayName: 'Test Pharmacist'
  };

  const mockPatientUser = {
    uid: 'patient-001',
    role: UserRole.Patient,
    email: 'patient@test.com',
    displayName: 'Test Patient'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      // Default to pharmacist user for protected routes
      req.user = mockPharmacistUser;
      next();
    });
    
    app.use('/api/inventory', inventoryRoutes);

    // Get the mocked service instance
    const { InventoryService } = require('./inventoryService');
    mockInventoryService = new InventoryService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/inventory/items', () => {
    it('should query inventory items successfully', async () => {
      const mockResponse = {
        items: [
          {
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
          }
        ],
        totalCount: 1,
        pharmacies: [],
        queryTime: new Date()
      };

      mockInventoryService.queryInventory.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/inventory/items')
        .query({ medicationName: 'Test Medication' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(mockInventoryService.queryInventory).toHaveBeenCalledWith({
        medicationName: 'Test Medication',
        genericName: undefined,
        dosage: undefined,
        form: undefined,
        pharmacyIds: undefined,
        includeUnavailable: undefined,
        location: undefined
      });
    });

    it('should handle query parameters correctly', async () => {
      mockInventoryService.queryInventory.mockResolvedValue({
        items: [],
        totalCount: 0,
        pharmacies: [],
        queryTime: new Date()
      });

      const response = await request(app)
        .get('/api/inventory/items')
        .query({
          medicationName: 'Test',
          genericName: 'Generic',
          dosage: '10mg',
          form: 'tablet',
          pharmacyIds: 'pharmacy-001,pharmacy-002',
          includeUnavailable: 'true',
          latitude: '40.7128',
          longitude: '-74.0060',
          radiusKm: '10'
        });

      expect(response.status).toBe(200);
      expect(mockInventoryService.queryInventory).toHaveBeenCalledWith({
        medicationName: 'Test',
        genericName: 'Generic',
        dosage: '10mg',
        form: 'tablet',
        pharmacyIds: ['pharmacy-001', 'pharmacy-002'],
        includeUnavailable: true,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          radiusKm: 10
        }
      });
    });

    it('should handle service errors', async () => {
      mockInventoryService.queryInventory.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/inventory/items');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to query inventory');
    });
  });

  describe('GET /api/inventory/pharmacies', () => {
    it('should get pharmacy locations successfully', async () => {
      const mockLocations = [
        {
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
        }
      ];

      mockInventoryService.getPharmacyLocations.mockResolvedValue(mockLocations);

      const response = await request(app)
        .get('/api/inventory/pharmacies');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
      expect(response.body.data.totalCount).toBe(1);
    });

    it('should handle service errors', async () => {
      mockInventoryService.getPharmacyLocations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/inventory/pharmacies');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch pharmacy locations');
    });
  });

  describe('POST /api/inventory/sync', () => {
    it('should sync inventory successfully for pharmacist', async () => {
      const mockSyncResponse = {
        success: true,
        syncedPharmacies: ['pharmacy-001'],
        failedPharmacies: [],
        syncTime: new Date(),
        message: undefined
      };

      mockInventoryService.syncInventory.mockResolvedValue(mockSyncResponse);

      const response = await request(app)
        .post('/api/inventory/sync')
        .send({
          pharmacyIds: ['pharmacy-001'],
          forceSync: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.syncedPharmacies).toContain('pharmacy-001');
      expect(mockInventoryService.syncInventory).toHaveBeenCalledWith({
        pharmacyIds: ['pharmacy-001'],
        forceSync: true
      });
    });

    it('should deny access to non-pharmacist users', async () => {
      // Override the auth middleware for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      testApp.use('/api/inventory', inventoryRoutes);

      const response = await request(testApp)
        .post('/api/inventory/sync')
        .send({
          pharmacyIds: ['pharmacy-001']
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. Pharmacist role required.');
    });

    it('should handle service errors', async () => {
      mockInventoryService.syncInventory.mockRejectedValue(new Error('Sync error'));

      const response = await request(app)
        .post('/api/inventory/sync')
        .send({
          pharmacyIds: ['pharmacy-001']
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to sync inventory');
    });
  });

  describe('GET /api/inventory/health', () => {
    it('should check health status successfully for pharmacist', async () => {
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

      const response = await request(app)
        .get('/api/inventory/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallHealth).toBe(true);
      expect(response.body.data.pharmacyStatuses).toHaveLength(1);
    });

    it('should deny access to non-pharmacist users', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      testApp.use('/api/inventory', inventoryRoutes);

      const response = await request(testApp)
        .get('/api/inventory/health');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. Pharmacist role required.');
    });
  });

  describe('GET /api/inventory/config', () => {
    it('should get configuration successfully for pharmacist', async () => {
      const mockConfig = {
        defaultTimeoutMs: 30000,
        defaultRetryAttempts: 3,
        defaultSyncIntervalMinutes: 15,
        maxConcurrentSyncs: 5,
        healthCheckIntervalMinutes: 5
      };

      const mockPharmacyConfigs = [
        {
          pharmacyId: 'pharmacy-001',
          name: 'Test Pharmacy',
          integrationType: 'rest_api',
          apiEndpoint: 'https://api.test.com',
          timeoutMs: 30000,
          retryAttempts: 3,
          isActive: true,
          syncIntervalMinutes: 15
        }
      ];

      mockInventoryService.getConfig.mockReturnValue(mockConfig);
      mockInventoryService.getAllPharmacyConfigs.mockReturnValue(mockPharmacyConfigs);

      const response = await request(app)
        .get('/api/inventory/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.config).toEqual(mockConfig);
      expect(response.body.data.pharmacyConfigs).toHaveLength(1);
    });
  });

  describe('POST /api/inventory/config/pharmacy', () => {
    it('should update pharmacy configuration successfully for pharmacist', async () => {
      const pharmacyConfig = {
        pharmacyId: 'pharmacy-001',
        name: 'Updated Pharmacy',
        integrationType: 'rest_api',
        apiEndpoint: 'https://api.updated.com',
        timeoutMs: 30000,
        retryAttempts: 3,
        isActive: true,
        syncIntervalMinutes: 15
      };

      mockInventoryService.updatePharmacyConfig.mockReturnValue(true);

      const response = await request(app)
        .post('/api/inventory/config/pharmacy')
        .send(pharmacyConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pharmacy configuration updated successfully');
      expect(mockInventoryService.updatePharmacyConfig).toHaveBeenCalledWith(pharmacyConfig);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/inventory/config/pharmacy')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pharmacy ID is required');
    });

    it('should handle service errors', async () => {
      mockInventoryService.updatePharmacyConfig.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      const response = await request(app)
        .post('/api/inventory/config/pharmacy')
        .send({
          pharmacyId: 'pharmacy-001',
          name: 'Test Pharmacy'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid configuration');
    });
  });

  describe('DELETE /api/inventory/config/pharmacy/:pharmacyId', () => {
    it('should remove pharmacy configuration successfully for pharmacist', async () => {
      mockInventoryService.removePharmacyConfig.mockReturnValue(true);

      const response = await request(app)
        .delete('/api/inventory/config/pharmacy/pharmacy-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pharmacy configuration removed successfully');
      expect(mockInventoryService.removePharmacyConfig).toHaveBeenCalledWith('pharmacy-001');
    });

    it('should handle non-existent pharmacy', async () => {
      mockInventoryService.removePharmacyConfig.mockReturnValue(false);

      const response = await request(app)
        .delete('/api/inventory/config/pharmacy/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pharmacy configuration not found');
    });
  });

  describe('GET /api/inventory/config/pharmacy/:pharmacyId', () => {
    it('should get pharmacy configuration successfully for pharmacist', async () => {
      const mockPharmacyConfig = {
        pharmacyId: 'pharmacy-001',
        name: 'Test Pharmacy',
        integrationType: 'rest_api',
        apiEndpoint: 'https://api.test.com',
        timeoutMs: 30000,
        retryAttempts: 3,
        isActive: true,
        syncIntervalMinutes: 15
      };

      mockInventoryService.getPharmacyConfig.mockReturnValue(mockPharmacyConfig);

      const response = await request(app)
        .get('/api/inventory/config/pharmacy/pharmacy-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPharmacyConfig);
    });

    it('should handle non-existent pharmacy', async () => {
      mockInventoryService.getPharmacyConfig.mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/inventory/config/pharmacy/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pharmacy configuration not found');
    });
  });
});