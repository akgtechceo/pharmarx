import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import { usePharmacyMap } from '../hooks/usePharmacyMap';
import { usePharmacyAvailability } from '../hooks/usePharmacyAvailability';
import PharmacyMarker from './PharmacyMarker';
import PharmacyInfoWindow from './PharmacyInfoWindow';
import PharmacySelectionModal from './PharmacySelectionModal';
import { getGoogleMapsApiKey } from '../../../config/environment';

interface PharmacyMapViewProps {
  medicationName: string;
  onPharmacySelect?: (pharmacyId: string) => void;
  className?: string;
}

// Error boundary component for map-related errors
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Map Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-800">
            <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Map Error</h3>
            <p className="text-sm">Something went wrong loading the map. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Map component that will be rendered inside the Wrapper
interface MapComponentProps {
  mapRef: React.RefObject<HTMLDivElement>;
  mapLoading: boolean;
  availabilityLoading: boolean;
  onMapLoad?: (map: google.maps.Map) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  mapRef, 
  mapLoading, 
  availabilityLoading, 
  onMapLoad 
}) => {
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.0060 }, // NYC default
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    onMapLoad?.(map);
  }, [mapRef, onMapLoad]);

  return (
    <div 
      ref={mapRef}
      data-testid="map-container"
      className="w-full h-96 bg-gray-100 rounded-lg relative overflow-hidden"
    >
      {mapLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {availabilityLoading && (
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full text-xs text-gray-600 z-10">
          Updating availability...
        </div>
      )}
    </div>
  );
};

const PharmacyMapView: React.FC<PharmacyMapViewProps> = ({
  medicationName,
  onPharmacySelect,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const apiKey = getGoogleMapsApiKey();
  const { pharmacies, isLoading: mapLoading, error: mapError, refetch } = usePharmacyMap(mapRef, {
    apiKey,
    searchRadius: 10 // 10km radius
  });
  const pharmacyIds = pharmacies.map(p => p.pharmacy.pharmacyId);
  const { availabilityData, isLoading: availabilityLoading } = usePharmacyAvailability(medicationName, pharmacyIds);

  const handlePharmacySelect = useCallback((pharmacyId: string) => {
    setSelectedPharmacyId(pharmacyId);
    setShowSelectionModal(true);
  }, []);

  // Removed unused handleInfoWindowOpen function

  // Listen for custom events from map markers
  useEffect(() => {
    const handleMarkerClick = (event: CustomEvent) => {
      const { pharmacy } = event.detail;
      setSelectedPharmacyId(pharmacy.pharmacy.pharmacyId);
      setShowInfoWindow(true);
    };

    const handleSelectPharmacy = (event: CustomEvent) => {
      const pharmacyId = event.detail;
      handlePharmacySelect(pharmacyId);
    };

    window.addEventListener('pharmacyMarkerClick', handleMarkerClick as EventListener);
    window.addEventListener('selectPharmacy', handleSelectPharmacy as EventListener);

    return () => {
      window.removeEventListener('pharmacyMarkerClick', handleMarkerClick as EventListener);
      window.removeEventListener('selectPharmacy', handleSelectPharmacy as EventListener);
    };
  }, [handlePharmacySelect]);

  const handleInfoWindowClose = useCallback(() => {
    setShowInfoWindow(false);
    setSelectedPharmacyId(null);
  }, []);

  const handleConfirmSelection = useCallback(() => {
    if (selectedPharmacyId) {
      onPharmacySelect?.(selectedPharmacyId);
    }
    setShowSelectionModal(false);
    setSelectedPharmacyId(null);
  }, [selectedPharmacyId, onPharmacySelect]);

  const handleCancelSelection = useCallback(() => {
    setShowSelectionModal(false);
    setSelectedPharmacyId(null);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    refetch();
  }, [refetch]);

  if (!apiKey) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="text-blue-800">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold">Interactive Pharmacy Map</h3>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Demo Mode - Sample Pharmacies</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900">CVS Pharmacy</p>
                    <p className="text-sm text-gray-600">123 Main St, New York, NY</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">In Stock (50 tablets)</p>
                  <p className="text-xs text-gray-500">2.5 km away</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900">Walgreens</p>
                    <p className="text-sm text-gray-600">456 Oak Ave, New York, NY</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-600">Low Stock (8 tablets)</p>
                  <p className="text-xs text-gray-500">3.2 km away</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900">Rite Aid</p>
                    <p className="text-sm text-gray-600">789 Pine St, New York, NY</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">Out of Stock</p>
                  <p className="text-xs text-gray-500">1.8 km away</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => onPharmacySelect?.('pharmacy-1')}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium"
            >
              Select CVS Pharmacy
            </button>
            <button
              onClick={() => onPharmacySelect?.('pharmacy-2')}
              className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 text-sm font-medium"
            >
              Select Walgreens
            </button>
          </div>
          
          <p className="text-xs text-blue-600 mt-3">
            💡 This is a demo view. In production, you would see an interactive map with real-time pharmacy locations.
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-800">
          <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Map Loading Error</h3>
          <p className="text-sm mb-4">{mapError.message}</p>
          <button 
            onClick={handleRetry}
            disabled={retryCount >= 3}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retryCount >= 3 ? 'Max Retries Reached' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <div className={`relative ${className}`}>
        <Wrapper 
          apiKey={apiKey}
          render={(status) => {
            if (status === 'LOADING') {
              return (
                <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading Google Maps...</p>
                  </div>
                </div>
              );
            }
            if (status === 'FAILURE') {
              return (
                <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center">
                  <div className="text-red-600">Failed to load Google Maps. Please check your internet connection.</div>
                </div>
              );
            }
            return (
              <MapComponent 
                mapRef={mapRef}
                mapLoading={mapLoading}
                availabilityLoading={availabilityLoading}
                onMapLoad={() => {
                  // Initialize map service with the loaded map
                  console.log('Map loaded successfully');
                }}
              />
            );
          }}
        />

        {/* Info Window */}
        {showInfoWindow && selectedPharmacyId && (
          <PharmacyInfoWindow
            pharmacy={pharmacies.find(p => p.pharmacy.pharmacyId === selectedPharmacyId)!}
            availability={availabilityData[selectedPharmacyId]}
            onClose={handleInfoWindowClose}
            onSelect={handlePharmacySelect}
          />
        )}

        {/* Selection Modal */}
        {showSelectionModal && selectedPharmacyId && (
          <PharmacySelectionModal
            pharmacy={pharmacies.find(p => p.pharmacy.pharmacyId === selectedPharmacyId)!}
            availability={availabilityData[selectedPharmacyId]}
            onConfirm={handleConfirmSelection}
            onCancel={handleCancelSelection}
          />
        )}
      </div>
    </MapErrorBoundary>
  );
};

export default PharmacyMapView;