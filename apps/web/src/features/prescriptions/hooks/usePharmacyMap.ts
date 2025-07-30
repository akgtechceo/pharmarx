import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapService, { MapConfig, UserLocation } from '../services/mapService';
import { MapPharmacyData } from '../../../types/pharmacy.types';

interface UsePharmacyMapOptions {
  apiKey: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  searchRadius?: number; // in kilometers
  debounceMs?: number; // debounce time for viewport changes
}

interface UsePharmacyMapReturn {
  map: any;
  userLocation: UserLocation | null;
  pharmacies: MapPharmacyData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Debounce utility function
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const usePharmacyMap = (
  mapRef: React.RefObject<HTMLDivElement>,
  options: UsePharmacyMapOptions
): UsePharmacyMapReturn => {
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [viewportBounds, setViewportBounds] = useState<any>(null);

  const defaultCenter = options.defaultCenter || { lat: 40.7128, lng: -74.0060 }; // NYC
  const defaultZoom = options.defaultZoom || 12;
  const searchRadius = options.searchRadius || 10; // 10km default
  const debounceMs = options.debounceMs || 300; // 300ms default debounce

  // Debounce viewport bounds to prevent excessive API calls
  const debouncedViewportBounds = useDebounce(viewportBounds, debounceMs);

  // Initialize map service when Google Maps API is available
  useEffect(() => {
    const initializeMap = async () => {
      // Wait for Google Maps API to be loaded by @googlemaps/react-wrapper
      if (!window.google?.maps) {
        return; // API not loaded yet, wait for it
      }

      try {
        const config: MapConfig = {
          apiKey: options.apiKey,
          center: defaultCenter,
          zoom: defaultZoom
        };

        await mapService.initialize(config);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize map service'));
      }
    };

    initializeMap();
  }, [options.apiKey, defaultCenter, defaultZoom, window.google?.maps]);

  // Create map instance
  useEffect(() => {
    if (!mapRef.current || !mapService || !window.google?.maps) return;

    try {
      const mapInstance = mapService.createMap(mapRef.current, {
        center: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : defaultCenter,
        zoom: defaultZoom
      });
      setMap(mapInstance);
      setError(null);

      // Add viewport change listener with debouncing
      const handleViewportChange = () => {
        if (mapInstance) {
          const bounds = mapInstance.getBounds();
          setViewportBounds(bounds);
        }
      };

      // Debounce the viewport change listener
      let viewportTimeout: NodeJS.Timeout;
      const debouncedViewportChange = () => {
        clearTimeout(viewportTimeout);
        viewportTimeout = setTimeout(handleViewportChange, debounceMs);
      };

      window.google.maps.event.addListener(mapInstance, 'bounds_changed', debouncedViewportChange);
      window.google.maps.event.addListener(mapInstance, 'zoom_changed', debouncedViewportChange);

      // Cleanup function
      return () => {
        clearTimeout(viewportTimeout);
        if (mapInstance) {
          window.google.maps.event.clearInstanceListeners(mapInstance);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create map'));
    }
  }, [mapRef, userLocation, defaultCenter, defaultZoom, debounceMs]);

  // Get user location
  const getUserLocation = useCallback(async () => {
    try {
      const location = await mapService.getUserLocation();
      setUserLocation(location);
      
      // Pan map to user location if map exists
      if (map) {
        mapService.panToLocation(location.latitude, location.longitude);
      }
      
      setError(null);
      return location;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get user location'));
      return null;
    }
  }, [map]);

  // Fetch nearby pharmacies with debounced viewport
  const {
    data: pharmacies = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['pharmacies', userLocation?.latitude, userLocation?.longitude, searchRadius, debouncedViewportBounds],
    queryFn: async () => {
      if (!userLocation) {
        throw new Error('User location not available');
      }

      const response = await fetch(
        `/api/inventory/pharmacies?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=${searchRadius}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pharmacies');
      }

      const pharmacyData: MapPharmacyData[] = await response.json();
      
      // Calculate distances and estimated delivery times
      return pharmacyData.map(pharmacy => ({
        ...pharmacy,
        distance: mapService.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          pharmacy.pharmacy.coordinates.latitude,
          pharmacy.pharmacy.coordinates.longitude
        ),
        estimatedDeliveryTime: Math.round(pharmacy.distance * 2 + Math.random() * 30) // Simple estimation
      }));
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000
  });

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // Add pharmacy markers to map
  useEffect(() => {
    if (!map || pharmacies.length === 0) return;

    try {
      mapService.addPharmacyMarkers(pharmacies);
    } catch (err) {
      console.error('Failed to add pharmacy markers:', err);
    }
  }, [map, pharmacies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mapService.destroy();
    };
  }, []);

  return {
    map,
    userLocation,
    pharmacies,
    isLoading,
    error,
    refetch
  };
};