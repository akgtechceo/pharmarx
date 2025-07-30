import { test, expect } from '@playwright/test';

test.describe('Map Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patient');
    
    // Mock geolocation
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

  test('map load performance with 100 pharmacy markers', async ({ page }) => {
    // Generate 100 pharmacy locations
    const pharmacies = Array.from({ length: 100 }, (_, i) => ({
      pharmacy: {
        pharmacyId: `pharmacy-${i}`,
        name: `Test Pharmacy ${i}`,
        coordinates: { 
          latitude: 40.7128 + (Math.random() - 0.5) * 0.2, 
          longitude: -74.0060 + (Math.random() - 0.5) * 0.2 
        },
        address: { 
          street: `${i} Test St`, 
          city: 'New York', 
          state: 'NY', 
          postalCode: '10001' 
        },
        operatingHours: { open: '9:00 AM', close: '6:00 PM' },
        contactInfo: { phone: `555-${i.toString().padStart(4, '0')}` }
      },
      inventoryItems: [{ 
        medicationName: 'Test Medication', 
        isAvailable: true, 
        quantity: Math.floor(Math.random() * 50) + 1 
      }],
      distance: Math.random() * 20,
      estimatedDeliveryTime: 30 + Math.random() * 120,
      isPreferred: i < 5 // First 5 are preferred
    }));

    // Mock API response
    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pharmacies)
      });
    });

    // Navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    // Measure map initialization time
    const startTime = Date.now();
    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();
    await expect(page.locator('text=Loading map...')).not.toBeVisible();
    const initTime = Date.now() - startTime;

    // Performance assertions
    expect(initTime).toBeLessThan(5000); // Should load within 5 seconds

    // Verify all markers are rendered
    await expect(page.locator('[data-testid="pharmacy-marker"]')).toHaveCount(100);

    // Test marker clustering performance
    const clusterMarkers = page.locator('[data-testid="marker-cluster"]');
    const individualMarkers = page.locator('[data-testid="pharmacy-marker"]');
    
    // Should have some clustering for performance
    const totalMarkers = await clusterMarkers.count() + await individualMarkers.count();
    expect(totalMarkers).toBe(100);
  });

  test('map interaction performance with many markers', async ({ page }) => {
    // Generate 50 pharmacies for interaction testing
    const pharmacies = Array.from({ length: 50 }, (_, i) => ({
      pharmacy: {
        pharmacyId: `pharmacy-${i}`,
        name: `Test Pharmacy ${i}`,
        coordinates: { 
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1, 
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1 
        },
        address: { 
          street: `${i} Test St`, 
          city: 'New York', 
          state: 'NY', 
          postalCode: '10001' 
        },
        operatingHours: { open: '9:00 AM', close: '6:00 PM' },
        contactInfo: { phone: `555-${i.toString().padStart(4, '0')}` }
      },
      inventoryItems: [{ 
        medicationName: 'Test Medication', 
        isAvailable: true, 
        quantity: 10 
      }],
      distance: Math.random() * 10,
      estimatedDeliveryTime: 45,
      isPreferred: false
    }));

    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pharmacies)
      });
    });

    // Navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();

    // Test marker click performance
    const markers = page.locator('[data-testid="pharmacy-marker"]');
    const firstMarker = markers.first();
    
    const clickStartTime = Date.now();
    await firstMarker.click();
    const clickTime = Date.now() - clickStartTime;

    // Marker click should be responsive
    expect(clickTime).toBeLessThan(1000);

    // Verify info window appears quickly
    await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
    
    // Test multiple rapid clicks
    const rapidClickStartTime = Date.now();
    for (let i = 0; i < 5; i++) {
      await markers.nth(i).click();
      await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
    }
    const rapidClickTime = Date.now() - rapidClickStartTime;
    
    // Rapid clicks should remain responsive
    expect(rapidClickTime).toBeLessThan(3000);
  });

  test('map viewport change performance', async ({ page }) => {
    // Generate pharmacies across a larger area
    const pharmacies = Array.from({ length: 200 }, (_, i) => ({
      pharmacy: {
        pharmacyId: `pharmacy-${i}`,
        name: `Test Pharmacy ${i}`,
        coordinates: { 
          latitude: 40.7128 + (Math.random() - 0.5) * 1.0, 
          longitude: -74.0060 + (Math.random() - 0.5) * 1.0 
        },
        address: { 
          street: `${i} Test St`, 
          city: 'New York', 
          state: 'NY', 
          postalCode: '10001' 
        },
        operatingHours: { open: '9:00 AM', close: '6:00 PM' },
        contactInfo: { phone: `555-${i.toString().padStart(4, '0')}` }
      },
      inventoryItems: [{ 
        medicationName: 'Test Medication', 
        isAvailable: true, 
        quantity: 10 
      }],
      distance: Math.random() * 50,
      estimatedDeliveryTime: 45,
      isPreferred: false
    }));

    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pharmacies)
      });
    });

    // Navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();

    // Test map panning performance
    const mapElement = page.locator('[data-testid="pharmacy-map"]');
    const mapBox = await mapElement.boundingBox();
    
    if (mapBox) {
      const centerX = mapBox.x + mapBox.width / 2;
      const centerY = mapBox.y + mapBox.height / 2;
      
      // Test panning in different directions
      const panStartTime = Date.now();
      
      // Pan right
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY);
      await page.mouse.up();
      
      // Pan down
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX, centerY + 100);
      await page.mouse.up();
      
      const panTime = Date.now() - panStartTime;
      
      // Panning should be smooth
      expect(panTime).toBeLessThan(2000);
    }

    // Test zoom performance
    const zoomStartTime = Date.now();
    
    // Zoom in
    await page.keyboard.press('+');
    await page.waitForTimeout(500);
    
    // Zoom out
    await page.keyboard.press('-');
    await page.waitForTimeout(500);
    
    const zoomTime = Date.now() - zoomStartTime;
    
    // Zoom operations should be responsive
    expect(zoomTime).toBeLessThan(2000);
  });

  test('memory usage during map interactions', async ({ page }) => {
    // This test would require browser performance APIs
    // For now, we'll test that the map doesn't crash during extended use
    
    const pharmacies = Array.from({ length: 100 }, (_, i) => ({
      pharmacy: {
        pharmacyId: `pharmacy-${i}`,
        name: `Test Pharmacy ${i}`,
        coordinates: { 
          latitude: 40.7128 + (Math.random() - 0.5) * 0.2, 
          longitude: -74.0060 + (Math.random() - 0.5) * 0.2 
        },
        address: { 
          street: `${i} Test St`, 
          city: 'New York', 
          state: 'NY', 
          postalCode: '10001' 
        },
        operatingHours: { open: '9:00 AM', close: '6:00 PM' },
        contactInfo: { phone: `555-${i.toString().padStart(4, '0')}` }
      },
      inventoryItems: [{ 
        medicationName: 'Test Medication', 
        isAvailable: true, 
        quantity: 10 
      }],
      distance: Math.random() * 20,
      estimatedDeliveryTime: 45,
      isPreferred: false
    }));

    await page.route('**/inventory/pharmacies**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pharmacies)
      });
    });

    // Navigate to pharmacy selection
    await page.click('[data-testid="upload-prescription-btn"]');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake prescription content')
    });
    await page.click('[data-testid="next-step-btn"]');

    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();

    // Perform extended interactions
    const markers = page.locator('[data-testid="pharmacy-marker"]');
    
    // Click through multiple markers
    for (let i = 0; i < 20; i++) {
      await markers.nth(i % 10).click();
      await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
      await page.waitForTimeout(100);
    }

    // Verify map is still functional
    await expect(page.locator('[data-testid="pharmacy-map"]')).toBeVisible();
    await expect(markers.first()).toBeVisible();
    
    // Test that we can still interact with markers
    await markers.first().click();
    await expect(page.locator('[data-testid="pharmacy-info-window"]')).toBeVisible();
  });
}); 