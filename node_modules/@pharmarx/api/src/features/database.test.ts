import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import databaseService from './database';
import admin from 'firebase-admin';

// Mock firebase-admin
vi.mock('firebase-admin', () => {
  const mockApp = {
    delete: vi.fn().mockResolvedValue(undefined)
  };

  return {
    default: {
      apps: [],
      initializeApp: vi.fn().mockReturnValue(mockApp),
      credential: {
        cert: vi.fn(),
        applicationDefault: vi.fn()
      },
      firestore: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn()
          })
        })
      }),
      Timestamp: {
        now: vi.fn().mockReturnValue({ seconds: 1640995200, nanoseconds: 0 })
      }
    }
  };
});

describe('DatabaseService', () => {
  let mockFirestore: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset the apps array to simulate no initialized apps
    (admin as any).apps.length = 0;

    // Setup mock Firestore
    mockFirestore = {
      collection: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({})
        })
      })
    };

    (admin.firestore as any).mockReturnValue(mockFirestore);
  });

  afterEach(async () => {
    // Clean up any initialized Firebase apps
    await databaseService.disconnect();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = databaseService;
      const instance2 = databaseService;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getDb', () => {
    it('should initialize Firebase and return Firestore instance', () => {
      const db = databaseService.getDb();
      
      expect(admin.initializeApp).toHaveBeenCalled();
      expect(admin.firestore).toHaveBeenCalled();
      expect(db).toBe(mockFirestore);
    });

    it('should not reinitialize if already initialized', () => {
      // First call
      databaseService.getDb();
      
      // Reset call count
      vi.clearAllMocks();
      (admin.firestore as any).mockReturnValue(mockFirestore);
      
      // Second call
      databaseService.getDb();
      
      // initializeApp should not be called again
      expect(admin.initializeApp).not.toHaveBeenCalled();
      expect(admin.firestore).toHaveBeenCalled();
    });

    it('should initialize with development settings', () => {
      process.env.NODE_ENV = 'development';
      process.env.FIREBASE_PROJECT_ID = 'test-project-dev';
      
      databaseService.getDb();
      
      expect(admin.initializeApp).toHaveBeenCalledWith({
        projectId: 'test-project-dev'
      });
      
      // Clean up
      delete process.env.NODE_ENV;
      delete process.env.FIREBASE_PROJECT_ID;
    });

    it('should initialize with test settings', () => {
      process.env.NODE_ENV = 'test';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      
      databaseService.getDb();
      
      expect(admin.initializeApp).toHaveBeenCalledWith({
        projectId: 'test-project'
      });
      
      // Clean up
      delete process.env.NODE_ENV;
      delete process.env.FIREBASE_PROJECT_ID;
    });

    it('should use default project ID if not specified in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.FIREBASE_PROJECT_ID;
      
      databaseService.getDb();
      
      expect(admin.initializeApp).toHaveBeenCalledWith({
        projectId: 'pharmarx-dev'
      });
      
      // Clean up
      delete process.env.NODE_ENV;
    });

    it('should initialize with production settings', () => {
      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = 'pharmarx-prod';
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        projectId: 'pharmarx-prod',
        clientEmail: 'test@pharmarx.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
      });
      
      databaseService.getDb();
      
      expect(admin.credential.cert).toHaveBeenCalled();
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
        projectId: 'pharmarx-prod'
      });
      
      // Clean up
      delete process.env.NODE_ENV;
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    });

    it('should use application default credentials in production if no service account key', () => {
      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = 'pharmarx-prod';
      delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      databaseService.getDb();
      
      expect(admin.credential.applicationDefault).toHaveBeenCalled();
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
        projectId: 'pharmarx-prod'
      });
      
      // Clean up
      delete process.env.NODE_ENV;
      delete process.env.FIREBASE_PROJECT_ID;
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      const mockCollection = {
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({})
        })
      };
      
      mockFirestore.collection.mockReturnValue(mockCollection);
      
      const result = await databaseService.healthCheck();
      
      expect(result).toEqual({
        status: 'healthy',
        connected: true
      });
      
      expect(admin.firestore.Timestamp.now).toHaveBeenCalled();
      expect(mockFirestore.collection).toHaveBeenCalledWith('_health');
      expect(mockCollection.limit).toHaveBeenCalledWith(1);
    });

    it('should return unhealthy status when database is not accessible', async () => {
      const mockCollection = {
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockRejectedValue(new Error('Connection failed'))
        })
      };
      
      mockFirestore.collection.mockReturnValue(mockCollection);
      
      const result = await databaseService.healthCheck();
      
      expect(result).toEqual({
        status: 'unhealthy',
        connected: false
      });
    });

    it('should handle database initialization errors', async () => {
      // Mock getDb to throw an error
      vi.spyOn(databaseService, 'getDb').mockImplementation(() => {
        throw new Error('Database initialization failed');
      });
      
      const result = await databaseService.healthCheck();
      
      expect(result).toEqual({
        status: 'unhealthy',
        connected: false
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect all Firebase apps', async () => {
      const mockApp1 = { delete: vi.fn().mockResolvedValue(undefined) };
      const mockApp2 = { delete: vi.fn().mockResolvedValue(undefined) };
      
      // Simulate initialized apps
      (admin as any).apps = [mockApp1, mockApp2];
      
      await databaseService.disconnect();
      
      expect(mockApp1.delete).toHaveBeenCalled();
      expect(mockApp2.delete).toHaveBeenCalled();
    });

    it('should handle apps array with null values', async () => {
      const mockApp = { delete: vi.fn().mockResolvedValue(undefined) };
      
      // Simulate apps array with null value
      (admin as any).apps = [mockApp, null];
      
      await databaseService.disconnect();
      
      expect(mockApp.delete).toHaveBeenCalled();
      // Should not throw error for null app
    });

    it('should handle empty apps array', async () => {
      (admin as any).apps = [];
      
      await expect(databaseService.disconnect()).resolves.toBeUndefined();
    });

    it('should handle app deletion errors gracefully', async () => {
      const mockApp = { 
        delete: vi.fn().mockRejectedValue(new Error('Failed to delete app'))
      };
      
      (admin as any).apps = [mockApp];
      
      // Should not throw error even if app deletion fails
      await expect(databaseService.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed service account key', () => {
      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = 'invalid-json';
      
      expect(() => {
        databaseService.getDb();
      }).toThrow();
      
      // Clean up
      delete process.env.NODE_ENV;
      delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    });
  });

  describe('singleton behavior', () => {
    it('should maintain singleton pattern across multiple requires', () => {
      // This test verifies that the singleton instance is maintained
      const service1 = databaseService;
      const service2 = databaseService;
      
      expect(service1).toBe(service2);
      expect(service1.getDb()).toBe(service2.getDb());
    });
  });
}); 