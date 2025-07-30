import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PharmacyMarker from '../PharmacyMarker';
import { MapPharmacyData, InventoryItem } from '../../../../types/pharmacy.types';

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

const createMockInventoryItem = (quantity: number = 50): InventoryItem => ({
  itemId: 'item-1',
  pharmacyId: 'pharmacy-1',
  medicationName: 'Test Medication',
  dosage: '10mg',
  form: 'tablet',
  strength: '10mg',
  quantity,
  unit: 'tablets',
  price: 25.99,
  currency: 'USD',
  lastUpdated: new Date(),
  isAvailable: quantity > 0
});

describe('PharmacyMarker', () => {
  const defaultProps = {
    pharmacy: createMockPharmacy('pharmacy-1'),
    availability: [createMockInventoryItem()],
    isSelected: false,
    onSelect: jest.fn(),
    onInfoWindowOpen: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pharmacy marker with correct information', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    // Check that the marker container exists
    const markerContainer = document.querySelector('[class*="absolute transform"]');
    expect(markerContainer).toBeInTheDocument();
  });

  it('shows correct distance', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    expect(screen.getByText('2.5 km')).toBeInTheDocument();
  });

  it('calls onSelect when marker is clicked', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    const marker = document.querySelector('[class*="rounded-full p-2"]');
    expect(marker).toBeInTheDocument();
    
    if (marker) {
      fireEvent.click(marker);
      expect(defaultProps.onSelect).toHaveBeenCalledWith('pharmacy-1');
    }
  });

  it('calls onInfoWindowOpen when info button is clicked', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    const infoButton = document.querySelector('[title="View pharmacy details"]');
    expect(infoButton).toBeInTheDocument();
    
    if (infoButton) {
      fireEvent.click(infoButton);
      expect(defaultProps.onInfoWindowOpen).toHaveBeenCalledWith('pharmacy-1');
    }
  });

  it('prevents event propagation when info button is clicked', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    const infoButton = document.querySelector('[title="View pharmacy details"]');
    const mockEvent = {
      stopPropagation: jest.fn()
    };
    
    if (infoButton) {
      fireEvent.click(infoButton, mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    }
  });

  it('shows in-stock status when medication is available', () => {
    const availability = [createMockInventoryItem(50)];
    render(<PharmacyMarker {...defaultProps} availability={availability} />);
    
    const marker = document.querySelector('[title*="in stock"]');
    expect(marker).toBeInTheDocument();
  });

  it('shows low-stock status when quantity is 10 or less', () => {
    const availability = [createMockInventoryItem(10)];
    render(<PharmacyMarker {...defaultProps} availability={availability} />);
    
    const marker = document.querySelector('[title*="low stock"]');
    expect(marker).toBeInTheDocument();
  });

  it('shows out-of-stock status when quantity is 0', () => {
    const availability = [createMockInventoryItem(0)];
    render(<PharmacyMarker {...defaultProps} availability={availability} />);
    
    const marker = document.querySelector('[title*="out of stock"]');
    expect(marker).toBeInTheDocument();
  });

  it('shows unavailable status when no availability data', () => {
    render(<PharmacyMarker {...defaultProps} availability={undefined} />);
    
    const marker = document.querySelector('[title*="unavailable"]');
    expect(marker).toBeInTheDocument();
  });

  it('applies selected styling when isSelected is true', () => {
    render(<PharmacyMarker {...defaultProps} isSelected={true} />);
    
    const marker = document.querySelector('[class*="ring-4 ring-blue-300"]');
    expect(marker).toBeInTheDocument();
  });

  it('applies scale transform when selected', () => {
    render(<PharmacyMarker {...defaultProps} isSelected={true} />);
    
    const container = document.querySelector('[class*="scale-110 z-20"]');
    expect(container).toBeInTheDocument();
  });

  it('uses correct marker colors for different availability statuses', () => {
    // Test in-stock (green)
    const { rerender } = render(
      <PharmacyMarker {...defaultProps} availability={[createMockInventoryItem(50)]} />
    );
    let marker = document.querySelector('[class*="bg-green-500"]');
    expect(marker).toBeInTheDocument();

    // Test low-stock (yellow)
    rerender(
      <PharmacyMarker {...defaultProps} availability={[createMockInventoryItem(10)]} />
    );
    marker = document.querySelector('[class*="bg-yellow-500"]');
    expect(marker).toBeInTheDocument();

    // Test out-of-stock (red)
    rerender(
      <PharmacyMarker {...defaultProps} availability={[createMockInventoryItem(0)]} />
    );
    marker = document.querySelector('[class*="bg-red-500"]');
    expect(marker).toBeInTheDocument();

    // Test unavailable (gray)
    rerender(<PharmacyMarker {...defaultProps} availability={undefined} />);
    marker = document.querySelector('[class*="bg-gray-400"]');
    expect(marker).toBeInTheDocument();
  });

  it('calculates total quantity correctly for multiple inventory items', () => {
    const availability = [
      createMockInventoryItem(5),
      createMockInventoryItem(3)
    ];
    render(<PharmacyMarker {...defaultProps} availability={availability} />);
    
    // Total quantity is 8, which should show as low stock
    const marker = document.querySelector('[title*="low stock"]');
    expect(marker).toBeInTheDocument();
  });

  it('positions marker correctly based on coordinates', () => {
    render(<PharmacyMarker {...defaultProps} />);
    
    const container = document.querySelector('[style*="left: -74.006%"]');
    expect(container).toBeInTheDocument();
  });
});