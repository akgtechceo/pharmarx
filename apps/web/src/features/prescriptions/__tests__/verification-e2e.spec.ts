import { test, expect, Page } from '@playwright/test';

// Mock data constants
const MOCK_ORDER_ID = 'test-order-123';
const VERIFICATION_URL = `/portal/patient/orders/${MOCK_ORDER_ID}/verify`;

// Helper functions
async function loginAsPatient(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'patient@test.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/portal/patient');
}

async function navigateToVerification(page: Page) {
  await page.goto(VERIFICATION_URL);
  await expect(page.locator('h2')).toContainText('Review Prescription Details');
}

test.describe('Prescription Verification E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/orders/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: MOCK_ORDER_ID,
            patientProfileId: 'patient-123',
            status: 'pending_verification',
            originalImageUrl: 'https://via.placeholder.com/400x600?text=Prescription',
            extractedText: 'Metformin 500mg, Take twice daily with meals, Quantity: 30 tablets',
            ocrStatus: 'completed',
            ocrProcessedAt: new Date().toISOString(),
            medicationDetails: {
              name: 'Metformin',
              dosage: '500mg',
              quantity: 30
            },
            cost: 25.99,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Mock verification API endpoints
    await page.route('**/api/orders/*/verify', async (route) => {
      const method = route.request().method();
      if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              orderId: MOCK_ORDER_ID,
              status: 'awaiting_payment',
              medicationDetails: JSON.parse(route.request().postData() || '{}').medicationDetails
            }
          })
        });
      }
    });

    await page.route('**/api/orders/*/skip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: MOCK_ORDER_ID,
            status: 'awaiting_payment'
          }
        })
      });
    });
  });

  test('displays prescription verification interface correctly', async ({ page }) => {
    await navigateToVerification(page);

    // Check main elements are present
    await expect(page.locator('h2')).toContainText('Review Prescription Details');
    await expect(page.locator('h3').first()).toContainText('Original Prescription');
    await expect(page.locator('h3').last()).toContainText('Medication Details');

    // Check prescription image is displayed
    const prescriptionImage = page.locator('img[alt="Prescription"]');
    await expect(prescriptionImage).toBeVisible();

    // Check OCR text is displayed
    await expect(page.locator('text=OCR Extracted Text:')).toBeVisible();
    await expect(page.locator('text=Metformin 500mg, Take twice daily with meals, Quantity: 30 tablets')).toBeVisible();

    // Check form fields are present and populated
    await expect(page.locator('[data-testid="medication-name"]')).toHaveValue('Metformin');
    await expect(page.locator('[data-testid="dosage"]')).toHaveValue('500mg');
    await expect(page.locator('[data-testid="quantity"]')).toHaveValue('30');

    // Check action buttons are present
    await expect(page.locator('button', { hasText: 'Confirm Details' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Skip & Send to Pharmacist' })).toBeVisible();
  });

  test('allows editing medication details', async ({ page }) => {
    await navigateToVerification(page);

    // Edit medication name
    const nameInput = page.locator('[data-testid="medication-name"]');
    await nameInput.clear();
    await nameInput.fill('Lisinopril');
    await expect(nameInput).toHaveValue('Lisinopril');

    // Edit dosage
    const dosageInput = page.locator('[data-testid="dosage"]');
    await dosageInput.clear();
    await dosageInput.fill('10mg');
    await expect(dosageInput).toHaveValue('10mg');

    // Edit quantity
    const quantityInput = page.locator('[data-testid="quantity"]');
    await quantityInput.clear();
    await quantityInput.fill('60');
    await expect(quantityInput).toHaveValue('60');
  });

  test('validates required fields before confirmation', async ({ page }) => {
    await navigateToVerification(page);

    // Clear all required fields
    await page.locator('[data-testid="medication-name"]').clear();
    await page.locator('[data-testid="dosage"]').clear();
    await page.locator('[data-testid="quantity"]').clear();

    // Try to confirm
    await page.click('button:has-text("Confirm Details")');

    // Check validation errors appear
    await expect(page.locator('text=Medication name is required')).toBeVisible();
    await expect(page.locator('text=Dosage is required')).toBeVisible();
    await expect(page.locator('text=Quantity must be greater than 0')).toBeVisible();

    // Check that form fields have error styling
    await expect(page.locator('[data-testid="medication-name"]')).toHaveClass(/border-red-500/);
    await expect(page.locator('[data-testid="dosage"]')).toHaveClass(/border-red-500/);
    await expect(page.locator('[data-testid="quantity"]')).toHaveClass(/border-red-500/);
  });

  test('confirms prescription details successfully', async ({ page }) => {
    await navigateToVerification(page);

    // Modify some details
    await page.locator('[data-testid="medication-name"]').clear();
    await page.locator('[data-testid="medication-name"]').fill('Updated Medicine');
    await page.locator('[data-testid="quantity"]').clear();
    await page.locator('[data-testid="quantity"]').fill('45');

    // Click confirm button
    await page.click('button:has-text("Confirm Details")');

    // Check loading state
    await expect(page.locator('button:has-text("Confirming...")')).toBeVisible();
    
    // Wait for navigation to payment page
    await expect(page).toHaveURL(/\/payment$/);
  });

  test('skips verification successfully', async ({ page }) => {
    await navigateToVerification(page);

    // Click skip button
    await page.click('button:has-text("Skip & Send to Pharmacist")');

    // Check loading state
    await expect(page.locator('button:has-text("Sending...")')).toBeVisible();
    
    // Wait for navigation to payment page
    await expect(page).toHaveURL(/\/payment$/);
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Override with error response
    await page.route('**/api/orders/*/verify', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await navigateToVerification(page);

    // Try to confirm
    await page.click('button:has-text("Confirm Details")');

    // Check error message appears
    await expect(page.locator('text=Failed to confirm prescription details')).toBeVisible();
    
    // Check buttons are re-enabled
    await expect(page.locator('button:has-text("Confirm Details")')).toBeEnabled();
    await expect(page.locator('button:has-text("Skip & Send to Pharmacist")')).toBeEnabled();
  });

  test('breadcrumb navigation works correctly', async ({ page }) => {
    await navigateToVerification(page);

    // Check breadcrumbs are present
    await expect(page.locator('nav[role="navigation"] >> text=Patient Portal')).toBeVisible();
    await expect(page.locator('nav[role="navigation"] >> text=Prescriptions')).toBeVisible();
    await expect(page.locator('nav[role="navigation"] >> text=Verify Prescription')).toBeVisible();

    // Test navigation back to patient portal
    await page.click('text=Patient Portal');
    await expect(page).toHaveURL('/portal/patient');
  });

  test('handles prescription image load errors', async ({ page }) => {
    // Override with broken image URL
    await page.route('**/api/orders/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: MOCK_ORDER_ID,
            patientProfileId: 'patient-123',
            status: 'pending_verification',
            originalImageUrl: 'https://broken-url.com/broken.jpg',
            medicationDetails: {
              name: 'Test Medicine',
              dosage: '10mg',
              quantity: 5
            }
          }
        })
      });
    });

    await navigateToVerification(page);

    // Trigger image error
    await page.evaluate(() => {
      const img = document.querySelector('img[alt="Prescription"]') as HTMLImageElement;
      if (img) {
        img.dispatchEvent(new Event('error'));
      }
    });

    // Check fallback image is used
    const image = page.locator('img[alt="Prescription"]');
    await expect(image).toHaveAttribute('src', '/placeholder-prescription.png');
  });

  test('is responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToVerification(page);

    // Check that layout adapts to mobile
    const container = page.locator('.grid');
    await expect(container).toHaveClass(/grid-cols-1/);

    // Check that buttons stack vertically on mobile
    const buttonContainer = page.locator('.flex.flex-col.sm\\:flex-row');
    await expect(buttonContainer).toBeVisible();

    // Verify all content is still accessible
    await expect(page.locator('h2')).toContainText('Review Prescription Details');
    await expect(page.locator('[data-testid="medication-name"]')).toBeVisible();
    await expect(page.locator('button:has-text("Confirm Details")')).toBeVisible();
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await navigateToVerification(page);

    // Test tab navigation through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="medication-name"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="dosage"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="quantity"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Confirm Details")')).toBeFocused();

    // Test Enter key on confirm button
    await page.keyboard.press('Enter');
    await expect(page.locator('button:has-text("Confirming...")')).toBeVisible();
  });
});

test.describe('Verification Page Error States', () => {
  test('shows error for invalid order ID', async ({ page }) => {
    await page.goto('/portal/patient/orders/invalid-id/verify');
    
    await expect(page.locator('h1')).toContainText('Error Loading Prescription');
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    await expect(page.locator('button:has-text("Return to Portal")')).toBeVisible();
  });

  test('shows error for wrong order status', async ({ page }) => {
    await page.route('**/api/orders/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: MOCK_ORDER_ID,
            status: 'delivered', // Wrong status for verification
            medicationDetails: {
              name: 'Test',
              dosage: '10mg',
              quantity: 1
            }
          }
        })
      });
    });

    await page.goto(VERIFICATION_URL);
    
    await expect(page.locator('h1')).toContainText('Verification Not Available');
    await expect(page.locator('text=currently in "delivered" status')).toBeVisible();
  });
});