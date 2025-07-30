import React, { useState, useRef, useCallback } from 'react';
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

  const handleInfoWindowOpen = useCallback((pharmacyId: string) => {
    setSelectedPharmacyId(pharmacyId);
    setShowInfoWindow(true);
  }, []);

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
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-yellow-800">
          <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Google Maps API Key Required</h3>
          <p className="text-sm">
            Please configure the VITE_GOOGLE_MAPS_API_KEY environment variable to enable map functionality.
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
        {/* Map Container */}
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

        {/* Pharmacy Markers */}
        {pharmacies.map((pharmacy) => (
          <PharmacyMarker
            key={pharmacy.pharmacy.pharmacyId}
            pharmacy={pharmacy}
            availability={availabilityData[pharmacy.pharmacy.pharmacyId]}
            isSelected={selectedPharmacyId === pharmacy.pharmacy.pharmacyId}
            onSelect={handlePharmacySelect}
            onInfoWindowOpen={handleInfoWindowOpen}
          />
        ))}

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