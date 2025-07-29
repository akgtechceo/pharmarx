import React, { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { DeliveryTrackingInfo } from '@pharmarx/shared-types';

interface DeliveryTrackingProps {
  orderId: string;
  trackingInfo: DeliveryTrackingInfo;
  className?: string;
}

interface MapComponentProps {
  trackingInfo: DeliveryTrackingInfo;
  onMapLoad?: (map: google.maps.Map) => void;
}

// Google Maps component that renders the actual map
const MapComponent: React.FC<MapComponentProps> = ({ trackingInfo, onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map centered between delivery person and destination
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(
      trackingInfo.currentLocation.latitude,
      trackingInfo.currentLocation.longitude
    ));
    bounds.extend(new google.maps.LatLng(
      trackingInfo.destinationLocation.latitude,
      trackingInfo.destinationLocation.longitude
    ));

    const map = new google.maps.Map(mapRef.current, {
      zoom: 14,
      center: {
        lat: trackingInfo.currentLocation.latitude,
        lng: trackingInfo.currentLocation.longitude
      },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    mapInstanceRef.current = map;
    onMapLoad?.(map);

    // Fit map to show both markers
    map.fitBounds(bounds);

    return () => {
      // Cleanup markers and polylines
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
    };
  }, []);

  // Update markers and route when tracking info changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    const map = mapInstanceRef.current;

    // Update delivery person marker
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setMap(null);
    }

    deliveryMarkerRef.current = new google.maps.Marker({
      position: {
        lat: trackingInfo.currentLocation.latitude,
        lng: trackingInfo.currentLocation.longitude
      },
      map,
      title: 'Delivery Person',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Update destination marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
    }

    destinationMarkerRef.current = new google.maps.Marker({
      position: {
        lat: trackingInfo.destinationLocation.latitude,
        lng: trackingInfo.destinationLocation.longitude
      },
      map,
      title: trackingInfo.destinationLocation.address,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });

    // Update route polyline if route data is available
    if (trackingInfo.route && routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    if (trackingInfo.route) {
      const routePath = trackingInfo.route.coordinates.map(coord => ({
        lat: coord[1], // coordinates are [lng, lat]
        lng: coord[0]
      }));

      routePolylineRef.current = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 1.0,
        strokeWeight: 3
      });

      routePolylineRef.current.setMap(map);
    }

  }, [trackingInfo]);

  return <div ref={mapRef} className="w-full h-96 rounded-lg" />;
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Helper function to format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

// Main DeliveryTracking component
const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ 
  orderId, 
  trackingInfo, 
  className = '' 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleMapLoad = (map: google.maps.Map) => {
    setMapLoaded(true);
    console.log('Google Maps loaded successfully', map);
  };

  const getStatusColor = (status: DeliveryTrackingInfo['status']) => {
    switch (status) {
      case 'assigned': return 'bg-gray-100 text-gray-800';
      case 'picked_up': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'approaching': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: DeliveryTrackingInfo['status']) => {
    switch (status) {
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'approaching': return 'Approaching';
      case 'delivered': return 'Delivered';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Delivery Tracking
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingInfo.status)}`}>
            {getStatusText(trackingInfo.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Estimated Arrival</h3>
            <p className="text-lg font-semibold text-blue-700">
              {trackingInfo.estimatedArrival.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
          
          {trackingInfo.route && (
            <>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-900 mb-1">Distance</h3>
                <p className="text-lg font-semibold text-green-700">
                  {formatDistance(trackingInfo.route.distance)}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900 mb-1">Duration</h3>
                <p className="text-lg font-semibold text-purple-700">
                  {formatDuration(trackingInfo.route.duration)}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Delivery Address</h3>
          <p className="text-gray-900">{trackingInfo.destinationLocation.address}</p>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Live Map</h3>
        <Wrapper 
          apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
          render={(status) => {
            if (status === 'LOADING') {
              return (
                <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500">Loading map...</div>
                </div>
              );
            }
            if (status === 'FAILURE') {
              return (
                <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center">
                  <div className="text-red-600">Failed to load map. Please check your internet connection.</div>
                </div>
              );
            }
            return <MapComponent trackingInfo={trackingInfo} onMapLoad={handleMapLoad} />;
          }}
        />
      </div>

      <div className="text-sm text-gray-500">
        <p>Last updated: {trackingInfo.currentLocation.timestamp.toLocaleString()}</p>
        <p>Order ID: {orderId}</p>
      </div>
    </div>
  );
};

export default DeliveryTracking;