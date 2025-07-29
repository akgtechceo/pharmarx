import express from 'express';
import { DeliveryTrackingInfo, ApiResponse, DeliveryNotificationPreferences } from '@pharmarx/shared-types';

const router = express.Router();

// Mock data for development - in production this would connect to Firestore
const mockDeliveryData: Map<string, DeliveryTrackingInfo> = new Map();

/**
 * GET /orders/:orderId/delivery-tracking
 * Get delivery tracking information for an order
 */
router.get('/:orderId/delivery-tracking', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Mock response for development
    const mockTrackingInfo: DeliveryTrackingInfo = {
      orderId,
      deliveryPersonId: 'delivery-person-123',
      currentLocation: {
        latitude: 3.8480,
        longitude: 11.5021,
        timestamp: new Date()
      },
      destinationLocation: {
        latitude: 3.8500,
        longitude: 11.5040,
        address: '123 Patient Street, Yaoundé, Cameroon'
      },
      estimatedArrival: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
      status: 'in_transit',
      route: {
        coordinates: [
          [11.5021, 3.8480], // current location
          [11.5030, 3.8490], // waypoint
          [11.5040, 3.8500]  // destination
        ],
        distance: 2500, // 2.5km
        duration: 1200  // 20 minutes
      }
    };

    const response: ApiResponse<DeliveryTrackingInfo> = {
      success: true,
      data: mockTrackingInfo
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    const response: ApiResponse<DeliveryTrackingInfo> = {
      success: false,
      error: 'Failed to fetch delivery tracking information'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /orders/:orderId/delivery-location
 * Update delivery person's current location (used by delivery person app)
 */
router.post('/:orderId/delivery-location', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    // In production, this would update the delivery tracking in Firestore
    // and trigger real-time updates to subscribed clients
    
    const response: ApiResponse<{ updated: boolean }> = {
      success: true,
      data: { updated: true },
      message: 'Location updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating delivery location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery location'
    });
  }
});

/**
 * POST /orders/:orderId/delivery-notifications
 * Update notification preferences for delivery tracking
 */
router.post('/:orderId/delivery-notifications', async (req, res) => {
  try {
    const { orderId } = req.params;
    const preferences: DeliveryNotificationPreferences = req.body;

    // Validate preferences
    if (typeof preferences.enableApproachNotification !== 'boolean' ||
        typeof preferences.enableArrivalNotification !== 'boolean' ||
        typeof preferences.approachThresholdMinutes !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification preferences'
      });
    }

    // In production, save preferences to Firestore
    
    const response: ApiResponse<DeliveryNotificationPreferences> = {
      success: true,
      data: preferences,
      message: 'Notification preferences updated'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

export default router;