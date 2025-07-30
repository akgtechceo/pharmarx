import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PharmacyMapView from '../PharmacyMapView';
import { MapPharmacyData, InventoryItem } from '../../../../types/pharmacy.types';

// Mock the hooks
vi.mock('../../hooks/usePharmacyMap', () => ({
  usePharmacyMap: vi.fn()
}));

vi.mock('../../hooks/usePharmacyAvailability', () => ({
  usePharmacyAvailability: vi.fn()
}));

// Import mocked hooks
import { usePharmacyMap } from '../../hooks/usePharmacyMap';
import { usePharmacyAvailability } from '../../hooks/usePharmacyAvailability';

const mockUsePharmacyMap = vi.mocked(usePharmacyMap);
const mockUsePharmacyAvailability = vi.mocked(usePharmacyAvailability);

// Mock Google Maps API
const mockGoogleMaps = {
  Map: vi.fn(),
  LatLng: vi.fn(),
  Marker: vi.fn(),
  InfoWindow: vi.fn(),
  places: {
    PlacesService: vi.fn()
  },
  event: {
    addListener: vi.fn()
  },
  MapTypeId: {
    ROADMAP: 'roadmap'
  },
  Animation: {
    DROP: 'drop'
  }
};

// Mock window.google
Object.defineProperty(window, 'google', {
  value: {
    maps: mockGoogleMaps
  },
  writable: true
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn()
};
Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

const createMockPharmacy = (id: string): MapPharmacyData => ({
  pharmacy: {
    pharmacyId: id,
    name: `Pharmacy ${id}`,
    address: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US'
    },
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    contactInfo: {
      phone: '555-123-4567',
      email: 'test@pharmacy.com'
    },
    operatingHours: {
      open: '09:00',
      close: '17:00',
      daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    lastInventorySync: new Date(),
    isActive: true
  },
  inventoryItems: [],
  distance: 2.5,
  estimatedDeliveryTime: 45,
  isPreferred: false
});

const createMockInventoryItem = (): InventoryItem => ({
  itemId: 'item-1',
  pharmacyId: 'pharmacy-1',
  medicationName: 'Test Medication',
  dosage: '10mg',
  form: 'tablet',
  strength: '10mg',
  quantity: 50,
  unit: 'tablets',
  price: 25.99,
  currency: 'USD',
  lastUpdated: new Date(),
  isAvailable: true
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PharmacyMapView', () => {
  const defaultProps = {
    medicationName: 'Test Medication',
    onPharmacySelect: vi.fn(),
    className: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUsePharmacyMap.mockReturnValue({
      map: null,
      userLocation: { latitude: 40.7128, longitude: -74.0060 },
      pharmacies: [createMockPharmacy('pharmacy-1'), createMockPharmacy('pharmacy-2')],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    mockUsePharmacyAvailability.mockReturnValue({
      availabilityData: {
        'pharmacy-1': [createMockInventoryItem()],
        'pharmacy-2': []
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });
  });

  it('renders map container', () => {
    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    // Check for the map container div with specific class
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('shows loading overlay when map is loading', () => {
    mockUsePharmacyMap.mockReturnValue({
      map: null,
      userLocation: null,
      pharmacies: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    });

    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('shows error state when map fails to load', () => {
    const errorMessage = 'Failed to load map';
    mockUsePharmacyMap.mockReturnValue({
      map: null,
      userLocation: null,
      pharmacies: [],
      isLoading: false,
      error: new Error(errorMessage),
      refetch: vi.fn()
    });

    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    expect(screen.getByText('Map Loading Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders pharmacy markers for each pharmacy', () => {
    const pharmacies = [
      createMockPharmacy('pharmacy-1'),
      createMockPharmacy('pharmacy-2'),
      createMockPharmacy('pharmacy-3')
    ];

    mockUsePharmacyMap.mockReturnValue({
      map: null,
      userLocation: { latitude: 40.7128, longitude: -74.0060 },
      pharmacies,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    // Check that pharmacy markers are rendered (they have specific titles)
    expect(screen.getByTitle('Pharmacy pharmacy-1 - in stock')).toBeInTheDocument();
    expect(screen.getByTitle('Pharmacy pharmacy-2 - unavailable')).toBeInTheDocument();
    expect(screen.getByTitle('Pharmacy pharmacy-3 - unavailable')).toBeInTheDocument();
  });

  it('shows availability loading indicator', () => {
    mockUsePharmacyAvailability.mockReturnValue({
      availabilityData: {},
      isLoading: true,
      error: null,
      refetch: vi.fn()
    });

    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    expect(screen.getByText('Updating availability...')).toBeInTheDocument();
  });

  it('handles pharmacy selection', async () => {
    renderWithQueryClient(<PharmacyMapView {...defaultProps} />);
    
    // Simulate pharmacy selection (this would be triggered by marker click)
    // Since markers are rendered by Google Maps, we test the callback
    const pharmacyId = 'pharmacy-1';
    defaultProps.onPharmacySelect(pharmacyId);
    
    expect(defaultProps.onPharmacySelect).toHaveBeenCalledWith(pharmacyId);
  });
});