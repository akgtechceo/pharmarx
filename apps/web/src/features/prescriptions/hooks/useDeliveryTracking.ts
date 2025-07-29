import { useQuery } from '@tanstack/react-query';
import { DeliveryTrackingInfo, ApiResponse } from '@pharmarx/shared-types';

interface UseDeliveryTrackingOptions {
  enabled?: boolean;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
}

interface UseDeliveryTrackingResult {
  trackingInfo: DeliveryTrackingInfo | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

/**
 * Hook for real-time delivery tracking with automatic polling
 * Polls every 15 seconds by default when order is out for delivery
 */
export const useDeliveryTracking = (
  orderId: string | undefined,
  options: UseDeliveryTrackingOptions = {}
): UseDeliveryTrackingResult => {
  const {
    enabled = true,
    refetchInterval = 15000, // 15 seconds - more frequent for active delivery tracking
    refetchIntervalInBackground = true
  } = options;

  const fetchDeliveryTracking = async (): Promise<DeliveryTrackingInfo> => {
    if (!orderId) {
      throw new Error('Order ID is required for delivery tracking');
    }

    const response = await fetch(`/api/orders/${orderId}/delivery-tracking`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch delivery tracking: ${response.statusText}`);
    }

    const data: ApiResponse<DeliveryTrackingInfo> = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to load delivery tracking data');
    }

    // Convert timestamp strings back to Date objects
    return {
      ...data.data,
      currentLocation: {
        ...data.data.currentLocation,
        timestamp: new Date(data.data.currentLocation.timestamp)
      },
      estimatedArrival: new Date(data.data.estimatedArrival)
    };
  };

  const {
    data: trackingInfo,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['deliveryTracking', orderId],
    queryFn: fetchDeliveryTracking,
    enabled: enabled && !!orderId,
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times with exponential backoff
      if (failureCount >= 3) return false;
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    trackingInfo,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null
  };
};

/**
 * Hook specifically for checking if an order should show delivery tracking
 * Based on order status being 'out_for_delivery'
 */
export const useDeliveryTrackingEligibility = (orderStatus: string | undefined) => {
  const isEligible = orderStatus === 'out_for_delivery';
  
  return {
    isEligible,
    shouldShowTracking: isEligible
  };
};

/**
 * Hook for calculating distance and ETA between two coordinates
 * Uses Google Maps Distance Matrix API for accurate calculations
 */
export const useDeliveryETA = (
  currentLocation: { latitude: number; longitude: number } | undefined,
  destinationLocation: { latitude: number; longitude: number } | undefined,
  enabled = true
) => {
  const calculateETA = async () => {
    if (!currentLocation || !destinationLocation || !window.google) {
      throw new Error('Location data or Google Maps not available');
    }

    const service = new google.maps.DistanceMatrixService();
    
    return new Promise<{ distance: number; duration: number }>((resolve, reject) => {
      service.getDistanceMatrix({
        origins: [new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude)],
        destinations: [new google.maps.LatLng(destinationLocation.latitude, destinationLocation.longitude)],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0].elements[0];
          if (element.status === 'OK') {
            resolve({
              distance: element.distance?.value || 0,
              duration: element.duration?.value || 0
            });
          } else {
            reject(new Error(`Distance calculation failed: ${element.status}`));
          }
        } else {
          reject(new Error(`Distance Matrix API error: ${status}`));
        }
      });
    });
  };

  return useQuery({
    queryKey: ['deliveryETA', currentLocation, destinationLocation],
    queryFn: calculateETA,
    enabled: enabled && !!currentLocation && !!destinationLocation,
    staleTime: 30000, // ETA calculations are valid for 30 seconds
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2
  });
};