import { test, expect } from '@playwright/test';

test.describe('Pharmacy Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the patient portal
    await page.goto('/patient');
    
    // Mock geolocation to a specific location (New York)
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 100,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      };
    });
  });

  test('complete pharmacy selection workflow with medication upload', async ({ page }) => {
    // Step 1: Upload prescription
    await page.click('[data-testid="upload-prescription-btn"]');
    
    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

    // Step 2: Navigate to pharmacy selection
    await page.click('[data-testid="next-step-btn"]');
    
    // Wait for map to load
    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();
    await expect(page.locator('text=Loading map...')).not.toBeVisible();

    // Step 3: Verify pharmacy markers are displayed
    await expect(page.locator('[data-testid="pharmacy-marker"]')).toHaveCount(3);

    // Step 4: Click on a pharmacy marker
    const firstPharmacyMarker = page.locator('[data-testid="pharmacy-marker"]').first();
    await firstPharmacyMarker.click();

    // Step 5: Verify pharmacy info window appears
    await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
    await expect(page.locator('[data-testid="pharmacy-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="medication-availability"]')).toBeVisible();

    // Step 6: Select the pharmacy
    await page.click('[data-testid="select-pharmacy-btn"]');

    // Step 7: Verify pharmacy selection modal
    await expect(page.locator('[data-testid="pharmacy-selection-modal"]')).toBeVisible();
    await expect(page.locator('text=Confirm Pharmacy Selection')).toBeVisible();

    // Step 8: Confirm selection
    await page.click('[data-testid="confirm-pharmacy-btn"]');

    // Step 9: Verify navigation to payment step
    await expect(page.locator('[data-testid="payment-step"]')).toBeVisible();
    await expect(page.locator('text=Selected Pharmacy')).toBeVisible();
  });

  test('handles medication unavailability gracefully', async ({ page }) => {
    // Mock API to return no available pharmacies
    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Verify unavailability message
    await expect(page.locator('text=No pharmacies found with this medication')).toBeVisible();
    await expect(page.locator('text=Please try a different medication or contact your doctor')).toBeVisible();
  });

  test('pharmacy selection with multiple medications', async ({ page }) => {
    // Mock API to return pharmacies with partial availability
    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            pharmacy: {
              pharmacyId: 'pharmacy-1',
              name: 'Test Pharmacy 1',
              coordinates: { latitude: 40.7128, longitude: -74.0060 },
              address: { street: '123 Test St', city: 'New York', state: 'NY', postalCode: '10001' },
              operatingHours: { open: '9:00 AM', close: '6:00 PM' },
              contactInfo: { phone: '555-1234' }
            },
            inventoryItems: [
              { medicationName: 'Medication A', isAvailable: true, quantity: 10 },
              { medicationName: 'Medication B', isAvailable: false, quantity: 0 }
            ],
            distance: 2.5,
            estimatedDeliveryTime: 45,
            isPreferred: false
          }
        ])
      });
    });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Verify partial availability is shown
    await expect(page.locator('[data-testid="pharmacy-marker"]')).toBeVisible();
    await page.click('[data-testid="pharmacy-marker"]');
    
    // Check availability status for each medication
    await expect(page.locator('text=Medication A: In Stock')).toBeVisible();
    await expect(page.locator('text=Medication B: Out of Stock')).toBeVisible();
  });

  test('map performance with multiple pharmacy markers', async ({ page }) => {
    // Mock API to return many pharmacies
    const manyPharmacies = Array.from({ length: 50 }, (_, i) => ({
      pharmacy: {
        pharmacyId: `pharmacy-${i}`,
        name: `Test Pharmacy ${i}`,
        coordinates: { 
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1, 
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1 
        },
        address: { street: `${i} Test St`, city: 'New York', state: 'NY', postalCode: '10001' },
        operatingHours: { open: '9:00 AM', close: '6:00 PM' },
        contactInfo: { phone: `555-${i.toString().padStart(4, '0')}` }
      },
      inventoryItems: [{ medicationName: 'Test Medication', isAvailable: true, quantity: 10 }],
      distance: Math.random() * 10,
      estimatedDeliveryTime: 30 + Math.random() * 60,
      isPreferred: false
    }));

    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(manyPharmacies)
      });
    });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Measure map load time
    const startTime = Date.now();
    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();
    await expect(page.locator('text=Loading map...')).not.toBeVisible();
    const loadTime = Date.now() - startTime;

    // Verify performance is acceptable (less than 3 seconds)
    expect(loadTime).toBeLessThan(3000);

    // Verify markers are rendered (should use clustering for performance)
    await expect(page.locator('[data-testid="pharmacy-marker"], [data-testid="marker-cluster"]')).toHaveCount(50);
  });

  test('mobile responsiveness of map interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Verify map is responsive
    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();
    
    // Verify mobile-friendly controls
    await expect(page.locator('[data-testid="mobile-map-controls"]')).toBeVisible();
    
    // Test touch interactions
    await page.locator('[data-testid="pharmacy-marker"]').first().tap();
    await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
    
    // Verify modal is mobile-friendly
    await page.click('[data-testid="select-pharmacy-btn"]');
    await expect(page.locator('[data-testid="pharmacy-selection-modal"]')).toBeVisible();
    
    // Check modal fits on mobile screen
    const modal = page.locator('[data-testid="pharmacy-selection-modal"]');
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375);
  });

  test('error handling for map API failures', async ({ page }) => {
    // Mock Google Maps API failure
    await page.route('**/maps.googleapis.com/**', async route => {
      await route.abort('failed');
    });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Verify error message is shown
    await expect(page.locator('text=Unable to load map')).toBeVisible();
    await expect(page.locator('text=Please try refreshing the page')).toBeVisible();
    
    // Verify fallback pharmacy list is shown
    await expect(page.locator('[data-testid="fallback-pharmacy-list"]')).toBeVisible();
  });

  test('pharmacy selection with user preferences', async ({ page }) => {
    // Mock user preferences for preferred pharmacies
    await page.route('**/user/preferences**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferredPharmacies: ['pharmacy-1', 'pharmacy-3']
        })
      });
    });

    // Mock pharmacy data with preferred flags
    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            pharmacy: {
              pharmacyId: 'pharmacy-1',
              name: 'Preferred Pharmacy 1',
              coordinates: { latitude: 40.7128, longitude: -74.0060 },
              address: { street: '123 Test St', city: 'New York', state: 'NY', postalCode: '10001' },
              operatingHours: { open: '9:00 AM', close: '6:00 PM' },
              contactInfo: { phone: '555-1234' }
            },
            inventoryItems: [{ medicationName: 'Test Medication', isAvailable: true, quantity: 10 }],
            distance: 2.5,
            estimatedDeliveryTime: 45,
            isPreferred: true
          },
          {
            pharmacy: {
              pharmacyId: 'pharmacy-2',
              name: 'Regular Pharmacy 2',
              coordinates: { latitude: 40.7130, longitude: -74.0062 },
              address: { street: '456 Test St', city: 'New York', state: 'NY', postalCode: '10001' },
              operatingHours: { open: '9:00 AM', close: '6:00 PM' },
              contactInfo: { phone: '555-5678' }
            },
            inventoryItems: [{ medicationName: 'Test Medication', isAvailable: true, quantity: 10 }],
            distance: 3.0,
            estimatedDeliveryTime: 60,
            isPreferred: false
          }
        ])
      });
    });

    // Upload prescription and navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Verify preferred pharmacy is highlighted
    await expect(page.locator('[data-testid="pharmacy-marker"][data-preferred="true"]')).toBeVisible();
    await expect(page.locator('text=Preferred Pharmacy 1')).toBeVisible();
    
    // Verify preferred pharmacy is suggested first
    const pharmacyMarkers = page.locator('[data-testid="pharmacy-marker"]');
    const firstMarker = pharmacyMarkers.first();
    await expect(firstMarker).toHaveAttribute('data-preferred', 'true');
  });
}); 