import { test, expect, Page } from '@playwright/test';

// Mock Google Maps API for E2E tests
const mockGoogleMapsScript = `
  window.google = {
    maps: {
      Map: class MockMap {
        constructor(element, options) {
          this.element = element;
          this.options = options;
        }
        fitBounds() {}
        setCenter() {}
        setZoom() {}
      },
      Marker: class MockMarker {
        constructor(options) {
          this.options = options;
        }
        setMap() {}
        setPosition() {}
      },
      Polyline: class MockPolyline {
        constructor(options) {
          this.options = options;
        }
        setMap() {}
        setPath() {}
      },
      LatLng: class MockLatLng {
        constructor(lat, lng) {
          this.lat = lat;
          this.lng = lng;
        }
      },
      LatLngBounds: class MockLatLngBounds {
        extend() {}
      },
      MapTypeId: {
        ROADMAP: 'roadmap'
      },
      Size: class MockSize {
        constructor(width, height) {
          this.width = width;
          this.height = height;
        }
      },
      DistanceMatrixService: class MockDistanceMatrixService {
        getDistanceMatrix(options, callback) {
          setTimeout(() => {
            callback({
              rows: [{
                elements: [{
                  status: 'OK',
                  distance: { value: 2500 },
                  duration: { value: 1800 }
                }]
              }]
            }, 'OK');
          }, 100);
        }
      }
    }
  };
`;

test.describe('Delivery Tracking E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Google Maps API
    await page.addInitScript(mockGoogleMapsScript);
    
    // Mock the API endpoints
    await page.route('**/api/orders/*/delivery-tracking', async route => {
      const orderId = route.url().match(/orders\/([^\/]+)\/delivery-tracking/)?.[1];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: orderId,
            deliveryPersonId: 'delivery-person-123',
            currentLocation: {
              latitude: 3.8480,
              longitude: 11.5021,
              timestamp: new Date().toISOString()
            },
            destinationLocation: {
              latitude: 3.8500,
              longitude: 11.5040,
              address: '123 Test Street, Yaoundé, Cameroon'
            },
            estimatedArrival: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            status: 'in_transit',
            route: {
              coordinates: [
                [11.5021, 3.8480],
                [11.5030, 3.8490],
                [11.5040, 3.8500]
              ],
              distance: 2500,
              duration: 1200
            }
          }
        })
      });
    });

    await page.route('**/api/orders/*/delivery-notifications', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enableApproachNotification: true,
            enableArrivalNotification: true,
            approachThresholdMinutes: 10
          },
          message: 'Notification preferences updated'
        })
      });
    });

    // Mock order status endpoint
    await page.route('**/api/orders/*', async route => {
      const orderId = route.url().match(/orders\/([^\/]*?)(?:\?|$)/)?.[1];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: orderId,
            patientProfileId: 'patient-123',
            status: 'out_for_delivery',
            originalImageUrl: 'https://example.com/prescription.jpg',
            medicationDetails: {
              name: 'Test Medication',
              dosage: '10mg',
              quantity: 30
            },
            cost: 25.50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });
  });

  test('should display Track Delivery button for out_for_delivery orders', async ({ page }) => {
    // Navigate to order status page
    await page.goto('/orders/test-order-123');

    // Wait for order status to load
    await expect(page.getByText('Ready for Delivery')).toBeVisible();
    
    // Check that Track Delivery button is visible
    await expect(page.getByRole('button', { name: /track delivery/i })).toBeVisible();
    
    // Check that delivery tracking status banner is shown
    await expect(page.getByText('Your medication is out for delivery')).toBeVisible();
    await expect(page.getByText('Click "Track Delivery" above to see real-time location')).toBeVisible();
  });

  test('should navigate to delivery tracking page when Track Delivery is clicked', async ({ page }) => {
    await page.goto('/orders/test-order-123');
    
    // Wait for page to load and click Track Delivery button
    await page.getByRole('button', { name: /track delivery/i }).click();
    
    // Should navigate to delivery tracking page
    await expect(page).toHaveURL(/\/delivery-tracking\/test-order-123/);
    
    // Should show delivery tracking page content
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    await expect(page.getByText('Back to Orders')).toBeVisible();
  });

  test('should display delivery tracking information correctly', async ({ page }) => {
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for tracking info to load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Check status display
    await expect(page.getByText('In Transit')).toBeVisible();
    
    // Check delivery information cards
    await expect(page.getByText('Estimated Arrival')).toBeVisible();
    await expect(page.getByText('Distance')).toBeVisible();
    await expect(page.getByText('Duration')).toBeVisible();
    
    // Check address display
    await expect(page.getByText('123 Test Street, Yaoundé, Cameroon')).toBeVisible();
    
    // Check distance and duration formatting
    await expect(page.getByText('2.5km')).toBeVisible();
    await expect(page.getByText('20 min')).toBeVisible();
  });

  test('should display Google Maps component', async ({ page }) => {
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for map container to be present
    await expect(page.locator('.w-full.h-96.rounded-lg')).toBeVisible();
    
    // Check that "Live Map" heading is present
    await expect(page.getByText('Live Map')).toBeVisible();
  });

  test('should handle map loading states correctly', async ({ page }) => {
    // Test loading state
    await page.route('**/api/orders/*/delivery-tracking', async route => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Should show loading state initially
    await expect(page.getByText('Loading delivery tracking...')).toBeVisible();
    
    // Should eventually load content
    await expect(page.getByText('Delivery Tracking')).toBeVisible({ timeout: 5000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/orders/*/delivery-tracking', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch delivery tracking information'
        })
      });
    });
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Should show error state
    await expect(page.getByText('Unable to Load Delivery Tracking')).toBeVisible();
    await expect(page.getByText('There was a problem loading the delivery tracking information')).toBeVisible();
    
    // Should show retry and back buttons
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible();
  });

  test('should support refresh functionality', async ({ page }) => {
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for initial load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Click refresh button
    const refreshButton = page.locator('button[aria-label*="refresh"], button:has(svg[stroke="currentColor"])').first();
    await refreshButton.click();
    
    // Should trigger a new API call (we can verify this by checking network requests)
    // The page should remain functional after refresh
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
  });

  test('should support back navigation', async ({ page }) => {
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for page to load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Click back button
    await page.getByRole('button', { name: /back to orders/i }).click();
    
    // Should navigate back (we'll check that URL changed)
    await expect(page).not.toHaveURL(/\/delivery-tracking/);
  });

  test('should display order information correctly', async ({ page }) => {
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for content to load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Check that order ID is displayed
    await expect(page.getByText('Order ID: test-order-123')).toBeVisible();
    
    // Check last updated timestamp
    await expect(page.getByText(/last updated:/i)).toBeVisible();
  });

  test('should show approaching status when delivery is near', async ({ page }) => {
    // Mock approaching status
    await page.route('**/api/orders/*/delivery-tracking', async route => {
      const orderId = route.url().match(/orders\/([^\/]+)\/delivery-tracking/)?.[1];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: orderId,
            deliveryPersonId: 'delivery-person-123',
            currentLocation: {
              latitude: 3.8495,
              longitude: 11.5035,
              timestamp: new Date().toISOString()
            },
            destinationLocation: {
              latitude: 3.8500,
              longitude: 11.5040,
              address: '123 Test Street, Yaoundé, Cameroon'
            },
            estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
            status: 'approaching',
            route: {
              coordinates: [
                [11.5035, 3.8495],
                [11.5040, 3.8500]
              ],
              distance: 500,
              duration: 300
            }
          }
        })
      });
    });
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Should show approaching status
    await expect(page.getByText('Approaching')).toBeVisible();
    
    // Should show approaching indicator in header
    await expect(page.getByText('Approaching').first()).toBeVisible();
  });

  test('should handle notifications correctly', async ({ page }) => {
    // Grant notification permission
    await page.context().grantPermissions(['notifications']);
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for page to load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Should request notification permission (this is handled automatically in our mock)
    // The notification functionality would be tested through the notification system
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Should still display all key elements on mobile
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    await expect(page.getByText('In Transit')).toBeVisible();
    await expect(page.getByText('Live Map')).toBeVisible();
    
    // Map should be responsive
    const mapContainer = page.locator('.w-full.h-96.rounded-lg');
    await expect(mapContainer).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/orders/*/delivery-tracking', async route => {
      requestCount++;
      const orderId = route.url().match(/orders\/([^\/]+)\/delivery-tracking/)?.[1];
      
      // Simulate location updates
      const locations = [
        { lat: 3.8480, lng: 11.5021 },
        { lat: 3.8485, lng: 11.5025 },
        { lat: 3.8490, lng: 11.5030 }
      ];
      
      const currentLocation = locations[(requestCount - 1) % locations.length];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: orderId,
            deliveryPersonId: 'delivery-person-123',
            currentLocation: {
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              timestamp: new Date().toISOString()
            },
            destinationLocation: {
              latitude: 3.8500,
              longitude: 11.5040,
              address: '123 Test Street, Yaoundé, Cameroon'
            },
            estimatedArrival: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            status: 'in_transit',
            route: {
              coordinates: [
                [currentLocation.lng, currentLocation.lat],
                [11.5040, 3.8500]
              ],
              distance: 2500 - (requestCount * 500),
              duration: 1200 - (requestCount * 200)
            }
          }
        })
      });
    });
    
    await page.goto('/delivery-tracking/test-order-123');
    
    // Wait for initial load
    await expect(page.getByText('Delivery Tracking')).toBeVisible();
    
    // Wait for at least one more request (polling)
    await page.waitForTimeout(16000); // Wait for polling interval
    
    // Should have made multiple requests
    expect(requestCount).toBeGreaterThan(1);
  });
});