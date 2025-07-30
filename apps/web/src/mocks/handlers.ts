import { http, HttpResponse } from 'msw';

// Mock pharmacy data
const mockPharmacies = [
  {
    pharmacy: {
      pharmacyId: 'pharmacy-1',
      name: 'CVS Pharmacy',
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      },
      contactInfo: {
        phone: '555-1234',
        email: 'cvs@example.com'
      },
      operatingHours: {
        open: '9:00 AM',
        close: '9:00 PM',
        daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      isAvailable: true
    },
    inventoryItems: [
      {
        itemId: 'item-1',
        pharmacyId: 'pharmacy-1',
        medicationName: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        dosage: '500mg',
        form: 'tablet',
        strength: '500mg',
        quantity: 50,
        unit: 'tablets',
        price: 15.99,
        currency: 'USD',
        lastUpdated: new Date(),
        isAvailable: true,
        expiryDate: new Date('2025-12-31')
      }
    ],
    distance: 2.5,
    estimatedDeliveryTime: 45,
    isPreferred: false
  },
  {
    pharmacy: {
      pharmacyId: 'pharmacy-2',
      name: 'Walgreens',
      coordinates: { latitude: 40.7130, longitude: -74.0062 },
      address: {
        street: '456 Oak Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      },
      contactInfo: {
        phone: '555-5678',
        email: 'walgreens@example.com'
      },
      operatingHours: {
        open: '8:00 AM',
        close: '10:00 PM',
        daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      isAvailable: true
    },
    inventoryItems: [
      {
        itemId: 'item-2',
        pharmacyId: 'pharmacy-2',
        medicationName: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        dosage: '500mg',
        form: 'tablet',
        strength: '500mg',
        quantity: 8,
        unit: 'tablets',
        price: 12.99,
        currency: 'USD',
        lastUpdated: new Date(),
        isAvailable: true,
        expiryDate: new Date('2025-12-31')
      }
    ],
    distance: 3.2,
    estimatedDeliveryTime: 60,
    isPreferred: false
  },
  {
    pharmacy: {
      pharmacyId: 'pharmacy-3',
      name: 'Rite Aid',
      coordinates: { latitude: 40.7125, longitude: -74.0058 },
      address: {
        street: '789 Pine St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      },
      contactInfo: {
        phone: '555-9012',
        email: 'riteaid@example.com'
      },
      operatingHours: {
        open: '9:00 AM',
        close: '8:00 PM',
        daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      isAvailable: true
    },
    inventoryItems: [
      {
        itemId: 'item-3',
        pharmacyId: 'pharmacy-3',
        medicationName: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        dosage: '500mg',
        form: 'tablet',
        strength: '500mg',
        quantity: 0,
        unit: 'tablets',
        price: 18.99,
        currency: 'USD',
        lastUpdated: new Date(),
        isAvailable: false,
        expiryDate: new Date('2025-12-31')
      }
    ],
    distance: 1.8,
    estimatedDeliveryTime: 30,
    isPreferred: true
  }
];

export const handlers = [
  // Mock pharmacy API endpoint
  http.get('/api/inventory/pharmacies', async ({ request }) => {
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radius = url.searchParams.get('radius');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return HttpResponse.json(mockPharmacies);
  }),

  // Mock pharmacy selection endpoint
  http.post('/api/pharmacy/select', async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return HttpResponse.json({
      success: true,
      message: 'Pharmacy selected successfully'
    });
  }),

  // Mock inventory availability endpoint
  http.get('/api/inventory/items', async ({ request }) => {
    const url = new URL(request.url);
    const medicationName = url.searchParams.get('medicationName');
    const pharmacyIds = url.searchParams.get('pharmacyIds');

    const availabilityData: Record<string, any[]> = {};
    
    mockPharmacies.forEach(pharmacy => {
      if (pharmacyIds?.includes(pharmacy.pharmacy.pharmacyId)) {
        availabilityData[pharmacy.pharmacy.pharmacyId] = pharmacy.inventoryItems;
      }
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return HttpResponse.json(availabilityData);
  })
]; 