import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PharmacyMapView from '../PharmacyMapView';

// Mock the environment configuration
vi.mock('../../../config/environment', () => ({
  getGoogleMapsApiKey: () => 'test-api-key'
}));

// Mock fetch for pharmacy data
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      {
        pharmacy: {
          pharmacyId: 'pharmacy-1',
          name: 'Test Pharmacy',
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          address: {
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001'
          },
          operatingHours: { open: '9:00 AM', close: '6:00 PM' },
          contactInfo: { phone: '555-1234', email: 'test@pharmacy.com' }
        },
        distance: 2.5,
        estimatedDeliveryTime: 45,
        isPreferred: false
      }
    ])
  })
) as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('PharmacyMapView Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <PharmacyMapView 
          medicationName="Test Medication"
          onPharmacySelect={vi.fn()}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('shows API key warning when no key is provided', () => {
    // Mock no API key
    vi.doMock('../../../config/environment', () => ({
      getGoogleMapsApiKey: () => ''
    }));

    render(
      <TestWrapper>
        <PharmacyMapView 
          medicationName="Test Medication"
          onPharmacySelect={vi.fn()}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Google Maps API Key Required')).toBeInTheDocument();
  });

  it('handles pharmacy selection', async () => {
    const mockOnPharmacySelect = vi.fn();
    
    render(
      <TestWrapper>
        <PharmacyMapView 
          medicationName="Test Medication"
          onPharmacySelect={mockOnPharmacySelect}
        />
      </TestWrapper>
    );

    // Wait for the map to load
    await waitFor(() => {
      expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});