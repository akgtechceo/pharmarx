import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Prescription Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete prescription upload flow for patient', async ({ page }) => {
    // Step 1: Login as patient
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to patient portal
    await expect(page).toHaveURL(/.*patient/);
    await expect(page.locator('text=Welcome back, Patient!')).toBeVisible();

    // Step 2: Open prescription upload modal
    await page.click('text=Upload New Prescription');
    
    // Verify modal opened
    await expect(page.locator('text=Upload Prescription')).toBeVisible();
    await expect(page.locator('text=Browse Files')).toBeVisible();
    await expect(page.locator('text=Take Photo')).toBeVisible();
    await expect(page.locator('text=Drag and drop your prescription')).toBeVisible();

    // Step 3: Test file validation with invalid file
    const invalidFile = path.join(__dirname, 'fixtures', 'invalid.txt');
    await page.setInputFiles('input[type="file"][accept*="image"]', invalidFile);
    
    // Should show validation error
    await expect(page.locator('text=File validation errors:')).toBeVisible();
    await expect(page.locator('text=File must be an image (JPG, PNG) or PDF')).toBeVisible();

    // Step 4: Upload valid prescription image
    const validFile = path.join(__dirname, 'fixtures', 'prescription.jpg');
    await page.setInputFiles('input[type="file"][accept*="image"]', validFile);

    // Step 5: Verify preview functionality
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('text=prescription.jpg')).toBeVisible();
    await expect(page.locator('img[alt="Prescription preview"]')).toBeVisible();
    
    // Verify file info is displayed
    await expect(page.locator('text=prescription.jpg')).toBeVisible();
    await expect(page.locator('text=Remove file')).toBeVisible();
    await expect(page.locator('text=Choose Different File')).toBeVisible();

    // Step 6: Test file removal and re-selection
    await page.click('text=Remove file');
    await expect(page.locator('text=Browse Files')).toBeVisible();
    await expect(page.locator('text=Preview')).not.toBeVisible();

    // Re-select file
    await page.setInputFiles('input[type="file"][accept*="image"]', validFile);
    await expect(page.locator('text=Preview')).toBeVisible();

    // Step 7: Submit prescription
    await page.click('text=Upload Prescription');

    // Verify upload progress indicators
    await expect(page.locator('text=Cancel Upload')).toBeVisible();
    
    // Wait for upload completion
    await expect(page.locator('text=Upload Prescription')).toBeVisible({ timeout: 10000 });

    // Step 8: Verify modal closes and success
    await expect(page.locator('text=Upload Prescription')).not.toBeVisible();
    
    // Should be back on patient portal
    await expect(page.locator('text=Welcome back, Patient!')).toBeVisible();
  });

  test('should complete prescription upload flow for caregiver', async ({ page }) => {
    // Step 1: Login as caregiver
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'caregiver@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to caregiver portal
    await expect(page).toHaveURL(/.*caregiver/);
    await expect(page.locator('text=Welcome, Caregiver!')).toBeVisible();

    // Step 2: Open prescription upload modal
    await page.click('text=Upload Patient Prescription');
    
    // Verify modal opened
    await expect(page.locator('text=Upload Prescription')).toBeVisible();

    // Step 3: Upload prescription
    const validFile = path.join(__dirname, 'fixtures', 'prescription.pdf');
    await page.setInputFiles('input[type="file"][accept*="pdf"]', validFile);

    // Step 4: Verify PDF preview
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('text=prescription.pdf')).toBeVisible();
    
    // PDF should show icon instead of image
    await expect(page.locator('[data-testid="pdf-preview"]')).toBeVisible();

    // Step 5: Submit prescription
    await page.click('text=Upload Prescription');

    // Wait for completion
    await expect(page.locator('text=Welcome, Caregiver!')).toBeVisible({ timeout: 10000 });
  });

  test('should handle camera capture on mobile', async ({ page, browserName }) => {
    // Skip if not testing mobile
    test.skip(browserName !== 'webkit', 'Camera test only on webkit/mobile');

    // Step 1: Login as patient
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);

    // Step 2: Open upload modal
    await page.click('text=Upload New Prescription');

    // Step 3: Test camera capture
    await page.click('text=Take Photo');
    
    // Camera input should have correct attributes
    const cameraInput = page.locator('input[capture="environment"]');
    await expect(cameraInput).toHaveAttribute('accept', 'image/*');
    await expect(cameraInput).toHaveAttribute('capture', 'environment');
  });

  test('should handle drag and drop upload', async ({ page }) => {
    // Step 1: Login and navigate to upload
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);
    await page.click('text=Upload New Prescription');

    // Step 2: Test drag enter/leave visual feedback
    const dropZone = page.locator('text=Drag and drop your prescription').locator('..');
    
    // Simulate drag enter
    await dropZone.dispatchEvent('dragenter', {
      dataTransfer: {
        files: []
      }
    });
    
    // Should show active state
    await expect(page.locator('text=Drop your file here')).toBeVisible();

    // Simulate drag leave
    await dropZone.dispatchEvent('dragleave');
    
    // Should return to normal state
    await expect(page.locator('text=Drag and drop your prescription')).toBeVisible();
  });

  test('should handle upload cancellation', async ({ page }) => {
    // Step 1: Login and start upload
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);
    await page.click('text=Upload New Prescription');

    // Step 2: Select file
    const validFile = path.join(__dirname, 'fixtures', 'prescription.jpg');
    await page.setInputFiles('input[type="file"][accept*="image"]', validFile);

    // Step 3: Start upload
    await page.click('text=Upload Prescription');
    
    // Step 4: Cancel upload
    await page.click('text=Cancel Upload');
    
    // Should return to preview state
    await expect(page.locator('text=Upload Prescription')).toBeVisible();
    await expect(page.locator('text=Cancel Upload')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Step 1: Setup network failure
    await page.route('**/uploads/prescription', route => {
      route.abort('failed');
    });

    // Step 2: Login and attempt upload
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);
    await page.click('text=Upload New Prescription');

    // Step 3: Upload file
    const validFile = path.join(__dirname, 'fixtures', 'prescription.jpg');
    await page.setInputFiles('input[type="file"][accept*="image"]', validFile);
    await page.click('text=Upload Prescription');

    // Step 4: Verify error handling
    await expect(page.locator('text=Network error during upload')).toBeVisible({ timeout: 10000 });
    
    // Should return to upload state
    await expect(page.locator('text=Upload Prescription')).toBeVisible();
  });

  test('should validate file size limits', async ({ page }) => {
    // Step 1: Login and open upload
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);
    await page.click('text=Upload New Prescription');

    // Step 2: Create large file (mock)
    await page.evaluate(() => {
      // Mock File constructor to create large file
      const originalFile = window.File;
      window.File = class extends originalFile {
        constructor(parts: any[], name: string, options?: FilePropertyBag) {
          super(parts, name, options);
          // Override size property to simulate large file
          Object.defineProperty(this, 'size', {
            value: 11 * 1024 * 1024 // 11MB - over the limit
          });
        }
      } as any;
    });

    // Step 3: Try to upload large file
    const validFile = path.join(__dirname, 'fixtures', 'prescription.jpg');
    await page.setInputFiles('input[type="file"][accept*="image"]', validFile);

    // Step 4: Should show size validation error
    await expect(page.locator('text=File size must be less than 10MB')).toBeVisible();
  });

  test('should handle modal close functionality', async ({ page }) => {
    // Step 1: Login and open modal
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'patient@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*patient/);
    await page.click('text=Upload New Prescription');

    // Step 2: Close modal using X button
    await page.click('[aria-label="Close modal"]');
    
    // Should return to patient portal
    await expect(page.locator('text=Upload Prescription')).not.toBeVisible();
    await expect(page.locator('text=Welcome back, Patient!')).toBeVisible();

    // Step 3: Open modal again
    await page.click('text=Upload New Prescription');
    
    // Step 4: Close modal using Escape key
    await page.keyboard.press('Escape');
    
    // Should close modal
    await expect(page.locator('text=Upload Prescription')).not.toBeVisible();
  });
});

// Test fixture setup
test.beforeAll(async () => {
  // Create test fixture files if they don't exist
  const fs = require('fs');
  const path = require('path');
  
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create test image file
  const imageBuffer = Buffer.from('fake-image-data');
  fs.writeFileSync(path.join(fixturesDir, 'prescription.jpg'), imageBuffer);

  // Create test PDF file
  const pdfBuffer = Buffer.from('fake-pdf-data');
  fs.writeFileSync(path.join(fixturesDir, 'prescription.pdf'), pdfBuffer);

  // Create invalid text file
  fs.writeFileSync(path.join(fixturesDir, 'invalid.txt'), 'invalid file content');
}); 