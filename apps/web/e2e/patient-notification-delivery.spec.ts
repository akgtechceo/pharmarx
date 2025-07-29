import { test, expect } from '@playwright/test';

test.describe('Patient Notification Delivery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for patient role
    await page.addInitScript(() => {
      window.localStorage.setItem('authToken', 'mock-patient-token');
      window.localStorage.setItem('userRole', 'patient');
      window.localStorage.setItem('userUid', 'patient-123');
    });

    // Mock notification preferences API
    await page.route('**/api/notifications/preferences/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              enableSMS: true,
              enableEmail: true,
              smsPhoneNumber: '+1234567890',
              emailAddress: 'patient@example.com'
            }
          })
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              enableSMS: true,
              enableEmail: false,
              smsPhoneNumber: '+1234567890'
            }
          })
        });
      }
    });

    // Mock notification history API
    await page.route('**/api/notifications/history/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              notificationId: 'notif-1',
              patientProfileId: 'patient-123',
              prescriptionId: 'prescription-456',
              notificationType: 'sms',
              status: 'sent',
              sentAt: new Date().toISOString(),
              deliveredAt: new Date().toISOString()
            },
            {
              notificationId: 'notif-2',
              patientProfileId: 'patient-123',
              prescriptionId: 'prescription-789',
              notificationType: 'email',
              status: 'delivered',
              sentAt: new Date().toISOString(),
              deliveredAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Navigate to patient notification settings
    await page.goto('/patient/notifications');
  });

  test('should display notification preferences', async ({ page }) => {
    // Check that notification preferences are displayed
    await expect(page.getByText('Notification Preferences')).toBeVisible();
    await expect(page.getByLabel('Enable SMS notifications')).toBeChecked();
    await expect(page.getByLabel('Enable Email notifications')).toBeChecked();
    await expect(page.getByDisplayValue('+1234567890')).toBeVisible();
    await expect(page.getByDisplayValue('patient@example.com')).toBeVisible();
  });

  test('should update notification preferences', async ({ page }) => {
    // Disable email notifications
    await page.getByLabel('Enable Email notifications').uncheck();
    
    // Clear email field
    await page.getByDisplayValue('patient@example.com').clear();
    
    // Save preferences
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for success message
    await expect(page.getByText('Notification preferences updated successfully')).toBeVisible();
    
    // Verify email is disabled
    await expect(page.getByLabel('Enable Email notifications')).not.toBeChecked();
  });

  test('should validate required fields when enabling notifications', async ({ page }) => {
    // Enable SMS without phone number
    await page.getByDisplayValue('+1234567890').clear();
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for validation error
    await expect(page.getByText('SMS phone number is required when SMS notifications are enabled')).toBeVisible();
    
    // Enable email without email address
    await page.getByDisplayValue('patient@example.com').clear();
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for validation error
    await expect(page.getByText('Email address is required when email notifications are enabled')).toBeVisible();
  });

  test('should display notification history', async ({ page }) => {
    // Navigate to notification history tab
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Check that notification history is displayed
    await expect(page.getByText('SMS')).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('sent')).toBeVisible();
    await expect(page.getByText('delivered')).toBeVisible();
  });

  test('should filter notification history by type', async ({ page }) => {
    // Navigate to notification history
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Filter by SMS
    await page.getByLabel('Filter by type:').selectOption('sms');
    await expect(page.getByText('SMS')).toBeVisible();
    await expect(page.getByText('Email')).not.toBeVisible();
    
    // Filter by Email
    await page.getByLabel('Filter by type:').selectOption('email');
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('SMS')).not.toBeVisible();
  });

  test('should display notification status correctly', async ({ page }) => {
    // Navigate to notification history
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Check status indicators
    await expect(page.getByText('sent')).toBeVisible();
    await expect(page.getByText('delivered')).toBeVisible();
    
    // Check status colors (assuming CSS classes)
    const sentStatus = page.locator('.status-sent');
    const deliveredStatus = page.locator('.status-delivered');
    
    await expect(sentStatus).toHaveClass(/sent/);
    await expect(deliveredStatus).toHaveClass(/delivered/);
  });

  test('should handle notification delivery status updates', async ({ page }) => {
    // Mock webhook for status update
    await page.route('**/api/notifications/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            notificationId: 'notif-1',
            status: 'delivered'
          }
        })
      });
    });

    // Navigate to notification history
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Simulate status update (this would normally come from webhook)
    await page.evaluate(() => {
      // Simulate webhook call
      fetch('/api/notifications/notif-1/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      });
    });
    
    // Check that status was updated
    await expect(page.getByText('delivered')).toBeVisible();
  });

  test('should handle notification preferences loading error', async ({ page }) => {
    // Mock API error
    await page.route('**/api/notifications/preferences/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to load notification preferences'
        })
      });
    });

    // Reload page
    await page.reload();
    
    // Check for error message
    await expect(page.getByText('Failed to load notification preferences')).toBeVisible();
  });

  test('should handle notification history loading error', async ({ page }) => {
    // Mock API error for history
    await page.route('**/api/notifications/history/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to load notification history'
        })
      });
    });

    // Navigate to notification history
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Check for error message
    await expect(page.getByText('Failed to load notification history')).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    // Enter invalid phone number
    await page.getByDisplayValue('+1234567890').clear();
    await page.getByDisplayValue('+1234567890').fill('invalid-phone');
    
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for validation error
    await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.getByDisplayValue('patient@example.com').clear();
    await page.getByDisplayValue('patient@example.com').fill('invalid-email');
    
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for validation error
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should show loading states during operations', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/notifications/preferences/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enableSMS: true,
            enableEmail: false,
            smsPhoneNumber: '+1234567890'
          }
        })
      });
    });

    // Update preferences
    await page.getByLabel('Enable Email notifications').uncheck();
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    
    // Check for loading state
    await expect(page.getByText('Saving...')).toBeVisible();
  });

  test('should handle notification preferences reset', async ({ page }) => {
    // Change preferences
    await page.getByLabel('Enable Email notifications').uncheck();
    await page.getByDisplayValue('patient@example.com').clear();
    
    // Reset to defaults
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();
    
    // Check that preferences are reset
    await expect(page.getByLabel('Enable SMS notifications')).toBeChecked();
    await expect(page.getByLabel('Enable Email notifications')).toBeChecked();
    await expect(page.getByDisplayValue('+1234567890')).toBeVisible();
    await expect(page.getByDisplayValue('patient@example.com')).toBeVisible();
  });

  test('should display notification delivery statistics', async ({ page }) => {
    // Navigate to notification history
    await page.getByRole('tab', { name: 'Notification History' }).click();
    
    // Check for statistics
    await expect(page.getByText('Total Notifications: 2')).toBeVisible();
    await expect(page.getByText('SMS: 1')).toBeVisible();
    await expect(page.getByText('Email: 1')).toBeVisible();
    await expect(page.getByText('Delivered: 2')).toBeVisible();
  });
});