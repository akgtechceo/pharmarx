import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
globalThis.process = globalThis.process ?? { env: {} }

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    Map: vi.fn(() => ({
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      addListener: vi.fn(),
      getBounds: vi.fn(() => ({
        getNorthEast: () => ({ lat: () => 40, lng: () => -74 }),
        getSouthWest: () => ({ lat: () => 39, lng: () => -75 })
      })),
      panTo: vi.fn(),
      setOptions: vi.fn()
    })),
    Marker: vi.fn(() => ({
      setMap: vi.fn(),
      addListener: vi.fn(),
      setPosition: vi.fn(),
      setTitle: vi.fn(),
      setIcon: vi.fn()
    })),
    InfoWindow: vi.fn(() => ({
      open: vi.fn(),
      close: vi.fn(),
      setContent: vi.fn(),
      setPosition: vi.fn()
    })),
    LatLng: vi.fn((lat: number, lng: number) => ({ lat: () => lat, lng: () => lng })),
    LatLngBounds: vi.fn(() => ({
      extend: vi.fn(),
      getCenter: vi.fn(() => ({ lat: () => 39.5, lng: () => -74.5 }))
    })),
    places: {
      PlacesService: vi.fn(() => ({
        findPlaceFromQuery: vi.fn(),
        getDetails: vi.fn()
      }))
    },
    Geocoder: vi.fn(() => ({
      geocode: vi.fn()
    })),
    event: {
      addListener: vi.fn(),
      clearInstanceListeners: vi.fn()
    },
    MapTypeId: {
      ROADMAP: 'roadmap'
    },
    Animation: {
      DROP: 'drop'
    }
  }
};

(globalThis as any).google = mockGoogleMaps;

// Mock fetch
(globalThis as any).fetch = vi.fn();

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn()
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      }
    });
  })
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

// Mock environment config
vi.mock('./config/environment', () => ({
  getGoogleMapsApiKey: vi.fn(() => 'test-api-key')
}));

// Setup MSW for API mocking
if (process.env.NODE_ENV === 'test') {
  const { server } = require('./mocks/server');
  server.listen();
} 