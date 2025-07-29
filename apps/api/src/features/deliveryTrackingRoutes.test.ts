import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import deliveryTrackingRoutes from './deliveryTrackingRoutes';
import { DeliveryTrackingInfo, ApiResponse, DeliveryNotificationPreferences } from '@pharmarx/shared-types';

// Create test express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/orders', deliveryTrackingRoutes);
  return app;
};

describe('Delivery Tracking Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe('GET /orders/:orderId/delivery-tracking', () => {
    it('should return delivery tracking info for valid order ID', async () => {
      const orderId = 'test-order-123';
      
      const response = await request(app)
        .get(`/orders/${orderId}/delivery-tracking`)
        .expect(200);

      const data: ApiResponse<DeliveryTrackingInfo> = response.body;
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data!.orderId).toBe(orderId);
      expect(data.data!.deliveryPersonId).toBe('delivery-person-123');
      expect(data.data!.status).toBe('in_transit');
      
      // Verify location data structure
      expect(data.data!.currentLocation).toHaveProperty('latitude');
      expect(data.data!.currentLocation).toHaveProperty('longitude');
      expect(data.data!.currentLocation).toHaveProperty('timestamp');
      
      expect(data.data!.destinationLocation).toHaveProperty('latitude');
      expect(data.data!.destinationLocation).toHaveProperty('longitude');
      expect(data.data!.destinationLocation).toHaveProperty('address');
      
      // Verify route data if present
      if (data.data!.route) {
        expect(data.data!.route).toHaveProperty('coordinates');
        expect(data.data!.route.coordinates).toBeInstanceOf(Array);
        expect(data.data!.route).toHaveProperty('distance');
        expect(data.data!.route).toHaveProperty('duration');
        expect(typeof data.data!.route.distance).toBe('number');
        expect(typeof data.data!.route.duration).toBe('number');
      }
    });

    it('should return tracking info with valid coordinate format', async () => {
      const response = await request(app)
        .get('/orders/test-order-123/delivery-tracking')
        .expect(200);

      const data: ApiResponse<DeliveryTrackingInfo> = response.body;
      
      if (data.data?.route) {
        data.data.route.coordinates.forEach(coord => {
          expect(coord).toHaveLength(2);
          expect(typeof coord[0]).toBe('number'); // longitude
          expect(typeof coord[1]).toBe('number'); // latitude
        });
      }
    });

    it('should return estimated arrival as a valid date', async () => {
      const response = await request(app)
        .get('/orders/test-order-123/delivery-tracking')
        .expect(200);

      const data: ApiResponse<DeliveryTrackingInfo> = response.body;
      
      expect(data.data!.estimatedArrival).toBeDefined();
      expect(new Date(data.data!.estimatedArrival)).toBeInstanceOf(Date);
      
      // Estimated arrival should be in the future (for mock data)
      const estimatedArrival = new Date(data.data!.estimatedArrival);
      const now = new Date();
      expect(estimatedArrival.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle different order IDs correctly', async () => {
      const orderIds = ['order-1', 'order-2', 'very-long-order-id-12345'];
      
      for (const orderId of orderIds) {
        const response = await request(app)
          .get(`/orders/${orderId}/delivery-tracking`)
          .expect(200);

        const data: ApiResponse<DeliveryTrackingInfo> = response.body;
        expect(data.data!.orderId).toBe(orderId);
      }
    });

    it('should handle server errors gracefully', async () => {
      // Mock console.error to suppress error logs during testing
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a version that throws an error
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.get('/orders/:orderId/delivery-tracking', () => {
        throw new Error('Database connection failed');
      });

      const response = await request(errorApp)
        .get('/orders/test-order-123/delivery-tracking')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch delivery tracking information');
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST /orders/:orderId/delivery-location', () => {
    it('should update delivery location with valid coordinates', async () => {
      const orderId = 'test-order-123';
      const locationUpdate = {
        latitude: 3.8485,
        longitude: 11.5025
      };

      const response = await request(app)
        .post(`/orders/${orderId}/delivery-location`)
        .send(locationUpdate)
        .expect(200);

      const data: ApiResponse<{ updated: boolean }> = response.body;
      
      expect(data.success).toBe(true);
      expect(data.data!.updated).toBe(true);
      expect(data.message).toBe('Location updated successfully');
    });

    it('should reject requests without latitude', async () => {
      const locationUpdate = {
        longitude: 11.5025
      };

      const response = await request(app)
        .post('/orders/test-order-123/delivery-location')
        .send(locationUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Latitude and longitude are required');
    });

    it('should reject requests without longitude', async () => {
      const locationUpdate = {
        latitude: 3.8485
      };

      const response = await request(app)
        .post('/orders/test-order-123/delivery-location')
        .send(locationUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Latitude and longitude are required');
    });

    it('should reject requests with invalid coordinates', async () => {
      const invalidUpdates = [
        { latitude: 'invalid', longitude: 11.5025 },
        { latitude: 3.8485, longitude: 'invalid' },
        { latitude: null, longitude: 11.5025 },
        { latitude: 3.8485, longitude: null }
      ];

      for (const update of invalidUpdates) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-location')
          .send(update)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Latitude and longitude are required');
      }
    });

    it('should handle extreme but valid coordinate values', async () => {
      const extremeCoordinates = [
        { latitude: -90, longitude: -180 },
        { latitude: 90, longitude: 180 },
        { latitude: 0, longitude: 0 }
      ];

      for (const coords of extremeCoordinates) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-location')
          .send(coords)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should handle server errors during location update', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a version that throws an error
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.post('/orders/:orderId/delivery-location', () => {
        throw new Error('Database update failed');
      });

      const response = await request(errorApp)
        .post('/orders/test-order-123/delivery-location')
        .send({ latitude: 3.8485, longitude: 11.5025 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update delivery location');
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST /orders/:orderId/delivery-notifications', () => {
    const validPreferences: DeliveryNotificationPreferences = {
      enableApproachNotification: true,
      enableArrivalNotification: true,
      approachThresholdMinutes: 10
    };

    it('should update notification preferences with valid data', async () => {
      const response = await request(app)
        .post('/orders/test-order-123/delivery-notifications')
        .send(validPreferences)
        .expect(200);

      const data: ApiResponse<DeliveryNotificationPreferences> = response.body;
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(validPreferences);
      expect(data.message).toBe('Notification preferences updated');
    });

    it('should handle different preference combinations', async () => {
      const preferenceCombinations = [
        {
          enableApproachNotification: false,
          enableArrivalNotification: true,
          approachThresholdMinutes: 5
        },
        {
          enableApproachNotification: true,
          enableArrivalNotification: false,
          approachThresholdMinutes: 15
        },
        {
          enableApproachNotification: false,
          enableArrivalNotification: false,
          approachThresholdMinutes: 20
        }
      ];

      for (const prefs of preferenceCombinations) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-notifications')
          .send(prefs)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(prefs);
      }
    });

    it('should reject invalid boolean values for notifications', async () => {
      const invalidPreferences = [
        {
          enableApproachNotification: 'true',
          enableArrivalNotification: true,
          approachThresholdMinutes: 10
        },
        {
          enableApproachNotification: true,
          enableArrivalNotification: 1,
          approachThresholdMinutes: 10
        }
      ];

      for (const prefs of invalidPreferences) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-notifications')
          .send(prefs)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid notification preferences');
      }
    });

    it('should reject invalid threshold values', async () => {
      const invalidThresholds = [
        {
          enableApproachNotification: true,
          enableArrivalNotification: true,
          approachThresholdMinutes: '10'
        },
        {
          enableApproachNotification: true,
          enableArrivalNotification: true,
          approachThresholdMinutes: null
        }
      ];

      for (const prefs of invalidThresholds) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-notifications')
          .send(prefs)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid notification preferences');
      }
    });

    it('should reject missing required fields', async () => {
      const incompletePreferences = [
        {
          enableApproachNotification: true,
          approachThresholdMinutes: 10
        },
        {
          enableArrivalNotification: true,
          approachThresholdMinutes: 10
        },
        {
          enableApproachNotification: true,
          enableArrivalNotification: true
        }
      ];

      for (const prefs of incompletePreferences) {
        const response = await request(app)
          .post('/orders/test-order-123/delivery-notifications')
          .send(prefs)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid notification preferences');
      }
    });

    it('should handle server errors during preference update', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.post('/orders/:orderId/delivery-notifications', () => {
        throw new Error('Database save failed');
      });

      const response = await request(errorApp)
        .post('/orders/test-order-123/delivery-notifications')
        .send(validPreferences)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update notification preferences');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Route Parameter Validation', () => {
    it('should handle special characters in order IDs', async () => {
      const specialOrderIds = [
        'order-with-dashes',
        'order_with_underscores',
        'order123numbers',
        'ORDER-UPPERCASE'
      ];

      for (const orderId of specialOrderIds) {
        const response = await request(app)
          .get(`/orders/${orderId}/delivery-tracking`)
          .expect(200);

        expect(response.body.data.orderId).toBe(orderId);
      }
    });

    it('should handle URL-encoded order IDs', async () => {
      const encodedOrderId = encodeURIComponent('order with spaces');
      
      const response = await request(app)
        .get(`/orders/${encodedOrderId}/delivery-tracking`)
        .expect(200);

      expect(response.body.data.orderId).toBe('order with spaces');
    });

    it('should handle very long order IDs', async () => {
      const longOrderId = 'a'.repeat(100);
      
      const response = await request(app)
        .get(`/orders/${longOrderId}/delivery-tracking`)
        .expect(200);

      expect(response.body.data.orderId).toBe(longOrderId);
    });
  });
});