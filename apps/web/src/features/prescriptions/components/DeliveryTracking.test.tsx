import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import DeliveryTracking from './DeliveryTracking';
import { DeliveryTrackingInfo } from '@pharmarx/shared-types';

// Mock Google Maps API
const mockMap = {
  fitBounds: vi.fn(),
  setCenter: vi.fn(),
  setZoom: vi.fn()
};

const mockMarker = {
  setMap: vi.fn(),
  setPosition: vi.fn()
};

const mockPolyline = {
  setMap: vi.fn(),
  setPath: vi.fn()
};

const mockBounds = {
  extend: vi.fn()
};

// Global Google Maps mock
const mockGoogle = {
  maps: {
    Map: vi.fn(() => mockMap),
    Marker: vi.fn(() => mockMarker),
    Polyline: vi.fn(() => mockPolyline),
    LatLng: vi.fn((lat, lng) => ({ lat, lng })),
    LatLngBounds: vi.fn(() => mockBounds),
    MapTypeId: {
      ROADMAP: 'roadmap'
    },
    Size: vi.fn((width, height) => ({ width, height }))
  }
};

// Mock the Google Maps wrapper
vi.mock('@googlemaps/react-wrapper', () => ({
  Wrapper: ({ children, render }: any) => {
    // Simulate successful loading
    return render('SUCCESS');
  }
}));

// Mock environment variable
vi.mock('import.meta.env', () => ({
  VITE_GOOGLE_MAPS_API_KEY: 'test-api-key'
}));

describe('DeliveryTracking Component', () => {
  const mockTrackingInfo: DeliveryTrackingInfo = {
    orderId: 'order-123',
    deliveryPersonId: 'delivery-person-456',
    currentLocation: {
      latitude: 3.8480,
      longitude: 11.5021,
      timestamp: new Date('2024-01-15T10:30:00Z')
    },
    destinationLocation: {
      latitude: 3.8500,
      longitude: 11.5040,
      address: '123 Test Street, Yaoundé, Cameroon'
    },
    estimatedArrival: new Date('2024-01-15T11:00:00Z'),
    status: 'in_transit',
    route: {
      coordinates: [
        [11.5021, 3.8480],
        [11.5030, 3.8490],
        [11.5040, 3.8500]
      ],
      distance: 2500,
      duration: 1800
    }
  };

  beforeAll(() => {
    // Setup global window.google
    (global as any).window = Object.create(window);
    (global as any).window.google = mockGoogle;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders delivery tracking component with basic information', () => {
    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    expect(screen.getByText('Delivery Tracking')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    expect(screen.getByText('123 Test Street, Yaoundé, Cameroon')).toBeInTheDocument();
    expect(screen.getByText('2.5km')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('displays estimated arrival time correctly', () => {
    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    expect(screen.getByText('11:00')).toBeInTheDocument();
  });

  it('shows correct status colors for different delivery statuses', () => {
    const statusTests = [
      { status: 'assigned' as const, expectedClass: 'bg-gray-100 text-gray-800' },
      { status: 'picked_up' as const, expectedClass: 'bg-blue-100 text-blue-800' },
      { status: 'in_transit' as const, expectedClass: 'bg-yellow-100 text-yellow-800' },
      { status: 'approaching' as const, expectedClass: 'bg-orange-100 text-orange-800' },
      { status: 'delivered' as const, expectedClass: 'bg-green-100 text-green-800' }
    ];

    statusTests.forEach(({ status, expectedClass }) => {
      const { unmount } = render(
        <DeliveryTracking 
          orderId="order-123" 
          trackingInfo={{ ...mockTrackingInfo, status }} 
        />
      );

      const statusElement = screen.getByText(status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
      expect(statusElement.className).toContain(expectedClass.split(' ')[0]);
      
      unmount();
    });
  });

  it('formats distance correctly for different values', () => {
    const testCases = [
      { distance: 500, expected: '500m' },
      { distance: 1000, expected: '1.0km' },
      { distance: 2500, expected: '2.5km' },
      { distance: 10300, expected: '10.3km' }
    ];

    testCases.forEach(({ distance, expected }) => {
      const { unmount } = render(
        <DeliveryTracking 
          orderId="order-123" 
          trackingInfo={{
            ...mockTrackingInfo,
            route: { ...mockTrackingInfo.route!, distance }
          }} 
        />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it('formats duration correctly for different values', () => {
    const testCases = [
      { duration: 300, expected: '5 min' }, // 5 minutes
      { duration: 1800, expected: '30 min' }, // 30 minutes
      { duration: 3600, expected: '1h 0m' }, // 1 hour
      { duration: 5400, expected: '1h 30m' } // 1.5 hours
    ];

    testCases.forEach(({ duration, expected }) => {
      const { unmount } = render(
        <DeliveryTracking 
          orderId="order-123" 
          trackingInfo={{
            ...mockTrackingInfo,
            route: { ...mockTrackingInfo.route!, duration }
          }} 
        />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles tracking info without route data', () => {
    const trackingInfoWithoutRoute = {
      ...mockTrackingInfo,
      route: undefined
    };

    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={trackingInfoWithoutRoute} 
      />
    );

    expect(screen.getByText('Delivery Tracking')).toBeInTheDocument();
    expect(screen.getByText('In Transit')).toBeInTheDocument();
    // Distance and duration cards should not be present
    expect(screen.queryByText('Distance')).not.toBeInTheDocument();
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
  });

  it('displays last updated timestamp', () => {
    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/Order ID: order-123/)).toBeInTheDocument();
  });

  it('creates Google Maps components when map loads successfully', async () => {
    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    await waitFor(() => {
      expect(mockGoogle.maps.Map).toHaveBeenCalled();
    });

    expect(mockGoogle.maps.LatLngBounds).toHaveBeenCalled();
    expect(mockBounds.extend).toHaveBeenCalledTimes(2);
  });

  it('handles map loading failure gracefully', () => {
    // Mock the wrapper to return FAILURE status
    vi.doMock('@googlemaps/react-wrapper', () => ({
      Wrapper: ({ render }: any) => render('FAILURE')
    }));

    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    expect(screen.getByText('Failed to load map. Please check your internet connection.')).toBeInTheDocument();
  });

  it('shows loading state when map is loading', () => {
    // Mock the wrapper to return LOADING status
    vi.doMock('@googlemaps/react-wrapper', () => ({
      Wrapper: ({ render }: any) => render('LOADING')
    }));

    render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('updates markers when tracking info changes', async () => {
    const { rerender } = render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    const updatedTrackingInfo = {
      ...mockTrackingInfo,
      currentLocation: {
        ...mockTrackingInfo.currentLocation,
        latitude: 3.8490,
        longitude: 11.5030
      }
    };

    rerender(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={updatedTrackingInfo} 
      />
    );

    await waitFor(() => {
      expect(mockGoogle.maps.Marker).toHaveBeenCalled();
    });
  });

  it('cleans up map resources on unmount', () => {
    const { unmount } = render(
      <DeliveryTracking 
        orderId="order-123" 
        trackingInfo={mockTrackingInfo} 
      />
    );

    unmount();

    // Cleanup should have been called (mocked in useEffect cleanup)
    expect(mockMarker.setMap).toHaveBeenCalledWith(null);
  });
});