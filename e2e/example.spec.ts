import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page title contains "PharmaRx"
  await expect(page).toHaveTitle(/PharmaRx/);
  
  // Check that the main heading is visible
  await expect(page.getByRole('heading', { name: 'PharmaRx' })).toBeVisible();
  
  // Check that the welcome message is displayed
  await expect(page.getByText('Welcome to PharmaRx - Prescription Management System')).toBeVisible();
}); 