import { test, expect } from '@playwright/test';

test.describe('Order History E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.addInitScript(() => {
      window.localStorage.setItem('authToken', 'mock-token');
      window.localStorage.setItem('userRole', 'Patient');
      window.localStorage.setItem('userId', 'test-patient-123');
    });
  });

  test('complete order history user flow', async ({ page }) => {
    // Mock API responses for order history
    await page.route('/api/orders/history*', async (route) => {
      const url = route.request().url();
      const searchParams = new URL(url).searchParams;
      const page = searchParams.get('page') || '1';
      const limit = searchParams.get('limit') || '10';
      
      const mockOrders = [
        {
          orderId: 'order-123',
          status: 'delivered',
          medicationDetails: {
            name: 'Aspirin',
            dosage: '500mg',
            quantity: 1
          },
          cost: 1500,
          createdAt: '2024-01-01T10:00:00Z',
          deliveredAt: '2024-01-02T14:30:00Z',
          hasReceipt: true
        },
        {
          orderId: 'order-456',
          status: 'preparing',
          medicationDetails: {
            name: 'Ibuprofen',
            dosage: '400mg',
            quantity: 2
          },
          cost: 2000,
          createdAt: '2024-01-03T09:15:00Z',
          hasReceipt: false
        }
      ];

      const response = {
        success: true,
        data: {
          orders: mockOrders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 2,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Mock receipt download endpoint
    await page.route('/api/orders/*/receipt*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="receipt-order-123.pdf"'
        },
        body: Buffer.from('fake-pdf-content')
      });
    });

    // Navigate to patient portal
    await page.goto('/portal/patient');
    
    // Verify patient portal loads
    await expect(page.getByText('Welcome back, Patient!')).toBeVisible();
    await expect(page.getByText('Recent Prescription History')).toBeVisible();
    
    // Click "View Full History" button
    await page.getByText('View Full History').click();
    
    // Verify navigation to order history page
    await expect(page).toHaveURL('/portal/patient/orders/history');
    await expect(page.getByText('Order History')).toBeVisible();
    await expect(page.getByText('View and manage your past prescription orders')).toBeVisible();
    
    // Verify breadcrumb navigation
    await expect(page.getByText('Patient Portal')).toBeVisible();
    await expect(page.getByText('Order History')).toBeVisible();
    
    // Verify order list displays correctly
    await expect(page.getByText('Order #order-123')).toBeVisible();
    await expect(page.getByText('Order #order-456')).toBeVisible();
    await expect(page.getByText('Medication: Aspirin')).toBeVisible();
    await expect(page.getByText('Medication: Ibuprofen')).toBeVisible();
    await expect(page.getByText('Cost: $1500.00')).toBeVisible();
    await expect(page.getByText('Cost: $2000.00')).toBeVisible();
    
    // Verify order status indicators
    await expect(page.getByText('delivered')).toBeVisible();
    await expect(page.getByText('preparing')).toBeVisible();
    
    // Verify receipt download button for delivered order
    await expect(page.getByText('Download Receipt')).toBeVisible();
    
    // Test receipt download functionality
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download Receipt').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('receipt-order-123.pdf');
    
    // Test pagination (when there are more orders)
    await expect(page.getByText('Showing 1 to 2 of 2 results')).toBeVisible();
    await expect(page.getByText('Page 1 of 1')).toBeVisible();
    
    // Test refresh functionality
    await page.getByText('Refresh').click();
    await expect(page.getByText('Order History')).toBeVisible();
    
    // Test breadcrumb navigation back to portal
    await page.getByText('Patient Portal').click();
    await expect(page).toHaveURL('/portal/patient');
    await expect(page.getByText('Welcome back, Patient!')).toBeVisible();
  });

  test('order history with empty state', async ({ page }) => {
    // Mock empty order history response
    await page.route('/api/orders/history*', async (route) => {
      const response = {
        success: true,
        data: {
          orders: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Navigate directly to order history
    await page.goto('/portal/patient/orders/history');
    
    // Verify empty state
    await expect(page.getByText('No orders found')).toBeVisible();
    await expect(page.getByText("You haven't placed any orders yet. Start by uploading a prescription.")).toBeVisible();
    await expect(page.getByText('Upload Prescription')).toBeVisible();
    
    // Test upload prescription button
    await page.getByText('Upload Prescription').click();
    await expect(page).toHaveURL('/portal/patient');
  });

  test('order history with pagination', async ({ page }) => {
    // Mock paginated order history response
    await page.route('/api/orders/history*', async (route) => {
      const url = route.request().url();
      const searchParams = new URL(url).searchParams;
      const pageNum = searchParams.get('page') || '1';
      
      const mockOrders = Array.from({ length: 10 }, (_, i) => ({
        orderId: `order-${1000 + i}`,
        status: 'delivered',
        medicationDetails: {
          name: `Medication ${i + 1}`,
          dosage: '500mg',
          quantity: 1
        },
        cost: 1500 + (i * 100),
        createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        deliveredAt: `2024-01-${String(i + 2).padStart(2, '0')}T14:30:00Z`,
        hasReceipt: true
      }));

      const response = {
        success: true,
        data: {
          orders: mockOrders,
          pagination: {
            page: parseInt(pageNum),
            limit: 10,
            total: 25,
            hasMore: parseInt(pageNum) < 3
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Navigate to order history
    await page.goto('/portal/patient/orders/history');
    
    // Verify pagination controls
    await expect(page.getByText('Showing 1 to 10 of 25 results')).toBeVisible();
    await expect(page.getByText('Page 1 of 3')).toBeVisible();
    
    // Test next page navigation
    await page.getByLabel('Next').click();
    await expect(page.getByText('Showing 11 to 20 of 25 results')).toBeVisible();
    await expect(page.getByText('Page 2 of 3')).toBeVisible();
    
    // Test previous page navigation
    await page.getByLabel('Previous').click();
    await expect(page.getByText('Showing 1 to 10 of 25 results')).toBeVisible();
    await expect(page.getByText('Page 1 of 3')).toBeVisible();
  });

  test('order history error handling', async ({ page }) => {
    // Mock API error response
    await page.route('/api/orders/history*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    // Navigate to order history
    await page.goto('/portal/patient/orders/history');
    
    // Verify error state
    await expect(page.getByText('Error loading order history')).toBeVisible();
    await expect(page.getByText('Internal server error')).toBeVisible();
    await expect(page.getByText('Try Again')).toBeVisible();
    
    // Test retry functionality
    await page.route('/api/orders/history*', async (route) => {
      const response = {
        success: true,
        data: {
          orders: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
    
    await page.getByText('Try Again').click();
    await expect(page.getByText('No orders found')).toBeVisible();
  });

  test('receipt download error handling', async ({ page }) => {
    // Mock successful order history but failed receipt download
    await page.route('/api/orders/history*', async (route) => {
      const response = {
        success: true,
        data: {
          orders: [{
            orderId: 'order-123',
            status: 'delivered',
            medicationDetails: {
              name: 'Aspirin',
              dosage: '500mg',
              quantity: 1
            },
            cost: 1500,
            createdAt: '2024-01-01T10:00:00Z',
            deliveredAt: '2024-01-02T14:30:00Z',
            hasReceipt: true
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Mock receipt download error
    await page.route('/api/orders/*/receipt*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Receipt not found'
        })
      });
    });

    // Navigate to order history
    await page.goto('/portal/patient/orders/history');
    
    // Attempt to download receipt
    await page.getByText('Download Receipt').click();
    
    // Verify error message
    await expect(page.getByText('Receipt not found')).toBeVisible();
  });

  test('mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock order history response
    await page.route('/api/orders/history*', async (route) => {
      const response = {
        success: true,
        data: {
          orders: [{
            orderId: 'order-123',
            status: 'delivered',
            medicationDetails: {
              name: 'Aspirin',
              dosage: '500mg',
              quantity: 1
            },
            cost: 1500,
            createdAt: '2024-01-01T10:00:00Z',
            deliveredAt: '2024-01-02T14:30:00Z',
            hasReceipt: true
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Navigate to order history
    await page.goto('/portal/patient/orders/history');
    
    // Verify mobile layout
    await expect(page.getByText('Order History')).toBeVisible();
    await expect(page.getByText('Order #order-123')).toBeVisible();
    
    // Verify mobile pagination controls
    await expect(page.getByText('Previous')).toBeVisible();
    await expect(page.getByText('Next')).toBeVisible();
    
    // Test mobile navigation
    await page.getByText('Patient Portal').click();
    await expect(page).toHaveURL('/portal/patient');
  });

  test('accessibility features', async ({ page }) => {
    // Mock order history response
    await page.route('/api/orders/history*', async (route) => {
      const response = {
        success: true,
        data: {
          orders: [{
            orderId: 'order-123',
            status: 'delivered',
            medicationDetails: {
              name: 'Aspirin',
              dosage: '500mg',
              quantity: 1
            },
            cost: 1500,
            createdAt: '2024-01-01T10:00:00Z',
            deliveredAt: '2024-01-02T14:30:00Z',
            hasReceipt: true
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            hasMore: false
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Navigate to order history
    await page.goto('/portal/patient/orders/history');
    
    // Verify accessibility features
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Receipt' })).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.getByText('Patient Portal')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByText('Refresh')).toBeFocused();
  });
});