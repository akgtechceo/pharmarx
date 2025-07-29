import { useEffect, useRef, useState, useCallback } from 'react';
import { DeliveryTrackingInfo, DeliveryNotificationEvent, DeliveryNotificationPreferences } from '@pharmarx/shared-types';

interface UseDeliveryNotificationsOptions {
  enabled?: boolean;
  preferences?: DeliveryNotificationPreferences;
  onNotification?: (event: DeliveryNotificationEvent) => void;
}

interface UseDeliveryNotificationsResult {
  notifications: DeliveryNotificationEvent[];
  unreadCount: number;
  markAsRead: (notificationId?: string) => void;
  clearAll: () => void;
  isApproaching: boolean;
  hasArrived: boolean;
}

const DEFAULT_PREFERENCES: DeliveryNotificationPreferences = {
  enableApproachNotification: true,
  enableArrivalNotification: true,
  approachThresholdMinutes: 10
};

/**
 * Hook for managing delivery approach and arrival notifications
 * Monitors delivery tracking info and triggers notifications based on proximity and status
 */
export const useDeliveryNotifications = (
  trackingInfo: DeliveryTrackingInfo | undefined,
  options: UseDeliveryNotificationsOptions = {}
): UseDeliveryNotificationsResult => {
  const {
    enabled = true,
    preferences = DEFAULT_PREFERENCES,
    onNotification
  } = options;

  const [notifications, setNotifications] = useState<DeliveryNotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isApproaching, setIsApproaching] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);

  // Track notification states to prevent duplicates
  const notificationSentRef = useRef<{
    approach: boolean;
    arrival: boolean;
  }>({ approach: false, arrival: false });

  // Helper function to calculate time difference in minutes
  const getMinutesUntilArrival = useCallback((estimatedArrival: Date): number => {
    const now = new Date();
    const diff = estimatedArrival.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60));
  }, []);

  // Helper function to create and trigger notification
  const createNotification = useCallback((
    type: 'approach' | 'arrival',
    orderId: string,
    estimatedArrival?: Date
  ): DeliveryNotificationEvent => {
    const notification: DeliveryNotificationEvent = {
      orderId,
      type,
      timestamp: new Date(),
      estimatedArrival,
      message: type === 'approach' 
        ? `Your delivery is approaching! Expected arrival in ${estimatedArrival ? getMinutesUntilArrival(estimatedArrival) : '~10'} minutes.`
        : 'Your delivery has arrived! The delivery person is at your location.'
    };

    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Trigger callback if provided
    onNotification?.(notification);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PharmaRx Delivery Update', {
        body: notification.message,
        icon: '/pharmarx-icon.png',
        tag: `delivery-${orderId}-${type}`,
        requireInteraction: type === 'arrival'
      });
    }

    return notification;
  }, [getMinutesUntilArrival, onNotification]);

  // Monitor tracking info for notification triggers
  useEffect(() => {
    if (!enabled || !trackingInfo) return;

    const { orderId, status, estimatedArrival } = trackingInfo;
    const minutesUntilArrival = getMinutesUntilArrival(estimatedArrival);

    // Check for approach notification
    if (preferences.enableApproachNotification && 
        !notificationSentRef.current.approach &&
        minutesUntilArrival <= preferences.approachThresholdMinutes &&
        minutesUntilArrival > 0 &&
        (status === 'in_transit' || status === 'approaching')) {
      
      setIsApproaching(true);
      createNotification('approach', orderId, estimatedArrival);
      notificationSentRef.current.approach = true;
    }

    // Check for arrival notification
    if (preferences.enableArrivalNotification &&
        !notificationSentRef.current.arrival &&
        (status === 'delivered' || minutesUntilArrival <= 0)) {
      
      setHasArrived(true);
      createNotification('arrival', orderId);
      notificationSentRef.current.arrival = true;
    }

    // Update approaching status based on current conditions
    setIsApproaching(status === 'approaching' || 
      (minutesUntilArrival <= preferences.approachThresholdMinutes && minutesUntilArrival > 0));

    // Update arrival status
    setHasArrived(status === 'delivered' || minutesUntilArrival <= 0);

  }, [trackingInfo, enabled, preferences, getMinutesUntilArrival, createNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, [enabled]);

  // Reset notification flags when tracking info changes (new order)
  useEffect(() => {
    if (trackingInfo?.orderId) {
      notificationSentRef.current = { approach: false, arrival: false };
    }
  }, [trackingInfo?.orderId]);

  const markAsRead = useCallback((notificationId?: string) => {
    if (notificationId) {
      // Mark specific notification as read (if we add read status to notifications)
      // For now, just reduce unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else {
      // Mark all as read
      setUnreadCount(0);
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isApproaching,
    hasArrived
  };
};

/**
 * Hook for managing notification preferences
 * Persists preferences to localStorage and syncs with server
 */
export const useDeliveryNotificationPreferences = (orderId: string) => {
  const [preferences, setPreferences] = useState<DeliveryNotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('delivery-notification-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (err) {
        console.error('Failed to parse stored notification preferences:', err);
      }
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<DeliveryNotificationPreferences>) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      // Save to localStorage
      localStorage.setItem('delivery-notification-preferences', JSON.stringify(updatedPreferences));
      setPreferences(updatedPreferences);

      // Sync to server
      const response = await fetch(`/api/orders/${orderId}/delivery-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPreferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      console.error('Error updating notification preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [preferences, orderId]);

  return {
    preferences,
    updatePreferences,
    isLoading,
    error
  };
};