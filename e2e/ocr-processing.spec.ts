import { test, expect } from '@playwright/test';

// E2E tests for complete prescription upload and OCR processing flow
test.describe('OCR Processing E2E Flow', () => {
  const testApiUrl = process.env.API_URL || 'http://localhost:3001/api';
  const testPatientId = 'test-patient-e2e-123';
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication for E2E tests
    await page.addInitScript(() => {
      localStorage.setItem('firebase_token', 'mock-jwt-token-for-e2e-testing');
    });
  });

  test('should complete full prescription order and OCR workflow', async ({ page }) => {
    // Mock successful OCR API responses
    await page.route(`${testApiUrl}/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        const mockOrder = {
          orderId: 'e2e-order-001',
          patientProfileId: testPatientId,
          status: 'pending_verification',
          originalImageUrl: 'https://example.com/prescription.jpg',
          ocrStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockOrder,
            message: 'Prescription order created successfully. OCR processing initiated.'
          })
        });
      }
    });

    await page.route(`${testApiUrl}/orders/e2e-order-001/ocr-status`, async (route) => {
      const mockStatus = {
        orderId: 'e2e-order-001',
        status: 'completed',
        extractedText: 'Patient: John Doe\nRx: Amoxicillin 500mg\nTake three times daily\nQty: 30 capsules',
        processedAt: new Date().toISOString()
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockStatus
        })
      });
    });

    // Navigate to prescription upload page
    await page.goto('/patient/upload-prescription');

    // Upload prescription image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock-image-data')
    });

    // Verify image preview is shown
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Submit the prescription order
    await page.click('[data-testid="upload-prescription-btn"]');

    // Verify success message and order creation
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-success"]')).toContainText('OCR processing initiated');

    // Navigate to order details to check OCR status
    await page.click('[data-testid="view-order-btn"]');

    // Wait for OCR processing to complete (simulate status checking)
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('completed');
    
    // Verify extracted text is displayed
    const extractedText = page.locator('[data-testid="extracted-text"]');
    await expect(extractedText).toBeVisible();
    await expect(extractedText).toContainText('Amoxicillin 500mg');
    await expect(extractedText).toContainText('John Doe');
  });

  test('should handle OCR failure with manual text entry fallback', async ({ page }) => {
    const orderId = 'e2e-order-failed-002';

    // Mock order creation
    await page.route(`${testApiUrl}/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        const mockOrder = {
          orderId,
          patientProfileId: testPatientId,
          status: 'pending_verification',
          originalImageUrl: 'https://example.com/poor-quality.jpg',
          ocrStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockOrder,
            message: 'Prescription order created successfully. OCR processing initiated.'
          })
        });
      }
    });

    // Mock OCR failure status
    await page.route(`${testApiUrl}/orders/${orderId}/ocr-status`, async (route) => {
      const mockStatus = {
        orderId,
        status: 'failed',
        error: 'Poor image quality - text extraction failed',
        processedAt: new Date().toISOString()
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockStatus
        })
      });
    });

    // Mock manual text entry success
    await page.route(`${testApiUrl}/orders/${orderId}/manual-text`, async (route) => {
      if (route.request().method() === 'PUT') {
        const mockUpdatedOrder = {
          orderId,
          patientProfileId: testPatientId,
          status: 'pending_verification',
          originalImageUrl: 'https://example.com/poor-quality.jpg',
          ocrStatus: 'completed',
          extractedText: 'Patient: Jane Smith\nRx: Lisinopril 10mg\nTake once daily\nQty: 30 tablets',
          ocrProcessedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockUpdatedOrder,
            message: 'Manual text entry completed successfully'
          })
        });
      }
    });

    // Navigate and upload prescription
    await page.goto('/patient/upload-prescription');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'poor-quality.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock-poor-quality-image')
    });

    await page.click('[data-testid="upload-prescription-btn"]');
    await page.click('[data-testid="view-order-btn"]');

    // Verify OCR failed status is shown
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('failed');
    await expect(page.locator('[data-testid="ocr-error"]')).toContainText('Poor image quality');

    // Show manual text entry form
    await expect(page.locator('[data-testid="manual-text-entry"]')).toBeVisible();
    
    // Enter text manually
    const manualTextArea = page.locator('[data-testid="manual-text-textarea"]');
    await manualTextArea.fill('Patient: Jane Smith\nRx: Lisinopril 10mg\nTake once daily\nQty: 30 tablets');

    // Submit manual text
    await page.click('[data-testid="submit-manual-text-btn"]');

    // Verify success message and updated status
    await expect(page.locator('[data-testid="manual-text-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="extracted-text"]')).toContainText('Lisinopril 10mg');
  });

  test('should show real-time OCR processing status updates', async ({ page }) => {
    const orderId = 'e2e-order-status-003';

    // Mock order creation
    await page.route(`${testApiUrl}/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              orderId,
              patientProfileId: testPatientId,
              ocrStatus: 'pending'
            },
            message: 'OCR processing initiated'
          })
        });
      }
    });

    // Mock progressive status updates
    let statusCallCount = 0;
    await page.route(`${testApiUrl}/orders/${orderId}/ocr-status`, async (route) => {
      statusCallCount++;
      
      let mockStatus;
      if (statusCallCount <= 2) {
        // First few calls: processing
        mockStatus = {
          orderId,
          status: 'processing',
          processedAt: null
        };
      } else {
        // Later calls: completed
        mockStatus = {
          orderId,
          status: 'completed',
          extractedText: 'Prescription: Metformin 500mg twice daily',
          processedAt: new Date().toISOString()
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockStatus
        })
      });
    });

    await page.goto('/patient/upload-prescription');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock-image-data')
    });

    await page.click('[data-testid="upload-prescription-btn"]');
    await page.click('[data-testid="view-order-btn"]');

    // Verify processing status is shown initially
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('processing');
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();

    // Wait for status to update to completed
    await expect(page.locator('[data-testid="ocr-status"]')).toContainText('completed', { timeout: 10000 });
    await expect(page.locator('[data-testid="extracted-text"]')).toContainText('Metformin 500mg');
    
    // Verify processing indicator is hidden
    await expect(page.locator('[data-testid="processing-indicator"]')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error for order creation
    await page.route(`${testApiUrl}/orders`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error during order creation'
        })
      });
    });

    await page.goto('/patient/upload-prescription');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'prescription.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock-image-data')
    });

    await page.click('[data-testid="upload-prescription-btn"]');

    // Verify error message is displayed
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('server error');
    
    // Verify retry option is available
    await expect(page.locator('[data-testid="retry-upload-btn"]')).toBeVisible();
  });

  test('should validate image files before upload', async ({ page }) => {
    await page.goto('/patient/upload-prescription');

    // Try to upload invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an image')
    });

    // Verify validation error
    await expect(page.locator('[data-testid="file-validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-validation-error"]')).toContainText('must be an image');
    
    // Verify upload button is disabled
    await expect(page.locator('[data-testid="upload-prescription-btn"]')).toBeDisabled();
  });

  test('should handle large file uploads', async ({ page }) => {
    // Mock order creation for large file
    await page.route(`${testApiUrl}/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              orderId: 'large-file-order',
              ocrStatus: 'pending'
            },
            message: 'Large file upload successful, OCR processing initiated'
          })
        });
      }
    });

    await page.goto('/patient/upload-prescription');

    // Upload large file (simulated)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-prescription.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(8 * 1024 * 1024) // 8MB file
    });

    // Verify file size warning if applicable
    const fileSizeWarning = page.locator('[data-testid="file-size-warning"]');
    if (await fileSizeWarning.isVisible()) {
      await expect(fileSizeWarning).toContainText('large file');
    }

    await page.click('[data-testid="upload-prescription-btn"]');

    // Verify upload progress indicator
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Verify successful upload
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 15000 });
  });

  test('should support multiple prescription formats', async ({ page }) => {
    const testCases = [
      { filename: 'prescription.jpg', mimeType: 'image/jpeg' },
      { filename: 'prescription.png', mimeType: 'image/png' },
      { filename: 'prescription.pdf', mimeType: 'application/pdf' }
    ];

    for (const testCase of testCases) {
      // Mock successful upload for each format
      await page.route(`${testApiUrl}/orders`, async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              orderId: `format-test-${testCase.filename}`,
              ocrStatus: 'pending'
            },
            message: `${testCase.filename} uploaded successfully`
          })
        });
      });

      await page.goto('/patient/upload-prescription');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: testCase.filename,
        mimeType: testCase.mimeType,
        buffer: Buffer.from(`mock-${testCase.mimeType}-data`)
      });

      // Verify file is accepted
      await expect(page.locator('[data-testid="file-validation-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="upload-prescription-btn"]')).toBeEnabled();

      await page.click('[data-testid="upload-prescription-btn"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    }
  });

  test('should maintain order history with OCR results', async ({ page }) => {
    // Mock orders list with OCR data
    await page.route(`${testApiUrl}/orders?patientId=${testPatientId}`, async (route) => {
      const mockOrders = [
        {
          orderId: 'history-order-1',
          patientProfileId: testPatientId,
          status: 'delivered',
          originalImageUrl: 'https://example.com/rx1.jpg',
          ocrStatus: 'completed',
          extractedText: 'Rx: Aspirin 81mg daily',
          createdAt: '2025-01-10T10:00:00Z',
          updatedAt: '2025-01-10T10:05:00Z'
        },
        {
          orderId: 'history-order-2',
          patientProfileId: testPatientId,
          status: 'preparing',
          originalImageUrl: 'https://example.com/rx2.jpg',
          ocrStatus: 'completed',
          extractedText: 'Rx: Metformin 500mg twice daily',
          createdAt: '2025-01-12T14:30:00Z',
          updatedAt: '2025-01-12T14:35:00Z'
        }
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockOrders
        })
      });
    });

    await page.goto('/patient/orders');

    // Verify order history is displayed
    await expect(page.locator('[data-testid="orders-list"]')).toBeVisible();
    
    // Check first order
    const firstOrder = page.locator('[data-testid="order-history-order-1"]');
    await expect(firstOrder).toBeVisible();
    await expect(firstOrder.locator('[data-testid="order-status"]')).toContainText('delivered');
    await expect(firstOrder.locator('[data-testid="extracted-text-preview"]')).toContainText('Aspirin 81mg');

    // Check second order
    const secondOrder = page.locator('[data-testid="order-history-order-2"]');
    await expect(secondOrder).toBeVisible();
    await expect(secondOrder.locator('[data-testid="order-status"]')).toContainText('preparing');
    await expect(secondOrder.locator('[data-testid="extracted-text-preview"]')).toContainText('Metformin 500mg');

    // Click to view full details of first order
    await firstOrder.click();
    await expect(page.locator('[data-testid="order-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="full-extracted-text"]')).toContainText('Aspirin 81mg daily');
  });
}); 