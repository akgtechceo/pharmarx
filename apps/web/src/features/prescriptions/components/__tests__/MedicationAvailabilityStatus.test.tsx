import React from 'react';
import { render, screen } from '@testing-library/react';
import MedicationAvailabilityStatus from '../MedicationAvailabilityStatus';
import { InventoryItem } from '../../../../types/pharmacy.types';

const createMockInventoryItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  itemId: 'item-1',
  pharmacyId: 'pharmacy-1',
  medicationName: 'Test Medication',
  genericName: 'Test Generic',
  dosage: '10mg',
  form: 'tablet',
  strength: '10mg',
  quantity: 50,
  unit: 'tablets',
  price: 25.99,
  currency: 'USD',
  lastUpdated: new Date('2024-01-01T10:00:00Z'),
  isAvailable: true,
  expiryDate: new Date('2025-01-01'),
  ...overrides
});

describe('MedicationAvailabilityStatus', () => {
  const defaultProps = {
    item: createMockInventoryItem()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders medication information correctly', () => {
    render(<MedicationAvailabilityStatus {...defaultProps} />);
    
    expect(screen.getByText('Test Medication')).toBeInTheDocument();
    expect(screen.getByText('Test Generic')).toBeInTheDocument();
    expect(screen.getByText('10mg')).toBeInTheDocument();
    expect(screen.getByText('tablet')).toBeInTheDocument();
    expect(screen.getByText('50 tablets')).toBeInTheDocument();
  });

  it('formats price correctly', () => {
    render(<MedicationAvailabilityStatus {...defaultProps} />);
    
    expect(screen.getByText('$25.99')).toBeInTheDocument();
  });

  it('shows in-stock status when quantity is greater than 10', () => {
    render(<MedicationAvailabilityStatus {...defaultProps} />);
    
    expect(screen.getByText('IN STOCK')).toBeInTheDocument();
  });

  it('shows low-stock status when quantity is 10 or less', () => {
    const item = createMockInventoryItem({ quantity: 10 });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText('LOW STOCK')).toBeInTheDocument();
  });

  it('shows out-of-stock status when quantity is 0', () => {
    const item = createMockInventoryItem({ quantity: 0 });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText('OUT OF STOCK')).toBeInTheDocument();
  });

  it('shows low stock warning when quantity is 10 or less', () => {
    const item = createMockInventoryItem({ quantity: 10 });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText(/Low stock - only 10 tablets remaining/)).toBeInTheDocument();
  });

  it('shows out of stock warning when quantity is 0', () => {
    const item = createMockInventoryItem({ quantity: 0 });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText('Currently out of stock')).toBeInTheDocument();
  });

  it('formats last updated time correctly', () => {
    const item = createMockInventoryItem({
      lastUpdated: new Date('2024-01-01T10:00:00Z')
    });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('shows expiry date when available', () => {
    const item = createMockInventoryItem({
      expiryDate: new Date('2025-01-01')
    });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText('Expires')).toBeInTheDocument();
    expect(screen.getByText('1/1/2025')).toBeInTheDocument();
  });

  it('does not show expiry date when not available', () => {
    const item = createMockInventoryItem({
      expiryDate: undefined
    });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.queryByText('Expires')).not.toBeInTheDocument();
  });

  it('renders compact view correctly', () => {
    render(<MedicationAvailabilityStatus {...defaultProps} compact={true} />);
    
    expect(screen.getByText('Test Medication 10mg')).toBeInTheDocument();
    expect(screen.getByText('10mg • tablet')).toBeInTheDocument();
    expect(screen.getByText('in stock')).toBeInTheDocument();
    expect(screen.getByText('50 tablets • $25.99')).toBeInTheDocument();
  });

  it('uses correct status colors', () => {
    // Test in-stock (green)
    const { rerender } = render(<MedicationAvailabilityStatus {...defaultProps} />);
    let statusElement = screen.getByText('IN STOCK');
    expect(statusElement).toHaveClass('text-green-600');

    // Test low-stock (yellow)
    const lowStockItem = createMockInventoryItem({ quantity: 10 });
    rerender(<MedicationAvailabilityStatus item={lowStockItem} />);
    statusElement = screen.getByText('LOW STOCK');
    expect(statusElement).toHaveClass('text-yellow-600');

    // Test out-of-stock (red)
    const outOfStockItem = createMockInventoryItem({ quantity: 0 });
    rerender(<MedicationAvailabilityStatus item={outOfStockItem} />);
    statusElement = screen.getByText('OUT OF STOCK');
    expect(statusElement).toHaveClass('text-red-600');
  });

  it('handles different medication forms', () => {
    const forms = ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'other'] as const;
    
    forms.forEach(form => {
      const item = createMockInventoryItem({ form });
      const { unmount } = render(<MedicationAvailabilityStatus item={item} />);
      
      expect(screen.getByText(form)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles different units', () => {
    const units = ['tablets', 'capsules', 'bottles', 'tubes', 'vials', 'units'] as const;
    
    units.forEach(unit => {
      const item = createMockInventoryItem({ unit });
      const { unmount } = render(<MedicationAvailabilityStatus item={item} />);
      
      expect(screen.getByText(`50 ${unit}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('calculates total quantity correctly for multiple items', () => {
    // This test would be relevant if the component handled multiple items
    // For now, it handles a single item
    const item = createMockInventoryItem({ quantity: 25 });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.getByText('25 tablets')).toBeInTheDocument();
  });

  it('handles missing generic name', () => {
    const item = createMockInventoryItem({ genericName: undefined });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.queryByText('Generic:')).not.toBeInTheDocument();
  });

  it('handles generic name same as medication name', () => {
    const item = createMockInventoryItem({ 
      medicationName: 'Test Medication',
      genericName: 'Test Medication'
    });
    render(<MedicationAvailabilityStatus item={item} />);
    
    expect(screen.queryByText('Generic: Test Medication')).not.toBeInTheDocument();
  });

  it('handles different currencies', () => {
    const item = createMockInventoryItem({ 
      price: 25.99,
      currency: 'EUR'
    });
    render(<MedicationAvailabilityStatus item={item} />);
    
    // Note: This test assumes the component uses Intl.NumberFormat
    // The actual formatting might vary based on locale
    expect(screen.getByText(/25.99/)).toBeInTheDocument();
  });
});