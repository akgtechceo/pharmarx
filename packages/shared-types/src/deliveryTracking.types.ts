export interface DeliveryTrackingInfo {
  orderId: string;
  deliveryPersonId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedArrival: Date;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'approaching' | 'delivered';
  route?: {
    coordinates: Array<[number, number]>; // [lng, lat] format for Google Maps
    distance: number; // in meters
    duration: number; // in seconds
  };
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface DeliveryNotificationPreferences {
  enableApproachNotification: boolean;
  enableArrivalNotification: boolean;
  approachThresholdMinutes: number; // default 10 minutes
}

export interface DeliveryNotificationEvent {
  orderId: string;
  type: 'approach' | 'arrival';
  timestamp: Date;
  estimatedArrival?: Date;
  message: string;
}