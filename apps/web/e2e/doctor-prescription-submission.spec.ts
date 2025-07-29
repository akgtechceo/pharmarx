import { test, expect } from '@playwright/test';

test.describe('Doctor Prescription Submission Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for doctor role
    await page.addInitScript(() => {
      window.localStorage.setItem('authToken', 'mock-doctor-token');
      window.localStorage.setItem('userRole', 'doctor');
      window.localStorage.setItem('userUid', 'doctor-123');
    });

    // Mock API responses
    await page.route('**/api/doctor/patients**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              profileId: 'patient-1',
              patientName: 'John Doe',
              dateOfBirth: '1990-01-01T00:00:00.000Z',
              phoneNumber: '+1234567890',
              email: 'john.doe@example.com',
              insuranceDetails: {
                provider: 'Blue Cross',
                policyNumber: 'BC123456'
              }
            },
            {
              profileId: 'patient-2',
              patientName: 'Jane Smith',
              dateOfBirth: '1985-05-15T00:00:00.000Z',
              phoneNumber: '+1987654321',
              email: 'jane.smith@example.com'
            }
          ]
        })
      });
    });

    await page.route('**/api/doctor/prescriptions**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              prescriptionId: 'prescription-123',
              doctorUid: 'doctor-123',
              patientProfileId: 'patient-1',
              medicationDetails: {
                name: 'Amoxicillin 500mg',
                dosage: '500mg, twice daily',
                quantity: 20,
                instructions: 'Take with food',
                refillsAuthorized: 2,
                refillsRemaining: 2
              },
              prescriptionNotes: 'Take as prescribed',
              submittedAt: new Date().toISOString(),
              status: 'submitted'
            }
          })
        });
      } else {
        // GET request for prescription history
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              prescriptions: [
                {
                  prescriptionId: 'prescription-123',
                  doctorUid: 'doctor-123',
                  patientProfileId: 'patient-1',
                  medicationDetails: {
                    name: 'Amoxicillin 500mg',
                    dosage: '500mg, twice daily',
                    quantity: 20,
                    instructions: 'Take with food',
                    refillsAuthorized: 2,
                    refillsRemaining: 2
                  },
                  prescriptionNotes: 'Take as prescribed',
                  submittedAt: new Date().toISOString(),
                  status: 'submitted'
                }
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                hasMore: false
              }
            }
          })
        });
      }
    });

    // Navigate to the doctor prescription portal
    await page.goto('/doctor/prescriptions');
  });

  test('should display patient search interface', async ({ page }) => {
    // Check that the search interface is visible
    await expect(page.getByPlaceholder('Search patients...')).toBeVisible();
    await expect(page.getByLabel('Search by:')).toBeVisible();
    await expect(page.getByDisplayValue('all')).toBeVisible();
  });

  test('should search for patients and display results', async ({ page }) => {
    // Type in search input
    await page.getByPlaceholder('Search patients...').fill('John');
    
    // Wait for search results to appear
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('+1234567890')).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();
  });

  test('should select a patient and display prescription form', async ({ page }) => {
    // Search for a patient
    await page.getByPlaceholder('Search patients...').fill('John');
    
    // Click on patient to select
    await page.getByText('John Doe').click();
    
    // Check that prescription form appears
    await expect(page.getByText('Submit Prescription for John Doe')).toBeVisible();
    await expect(page.getByLabel('Medication Name *')).toBeVisible();
    await expect(page.getByLabel('Dosage *')).toBeVisible();
    await expect(page.getByLabel('Quantity *')).toBeVisible();
    await expect(page.getByLabel('Instructions *')).toBeVisible();
    await expect(page.getByLabel('Refills Authorized *')).toBeVisible();
  });

  test('should validate required fields before submission', async ({ page }) => {
    // Search and select a patient
    await page.getByPlaceholder('Search patients...').fill('John');
    await page.getByText('John Doe').click();
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Submit Prescription' }).click();
    
    // Check for validation errors
    await expect(page.getByText('Medication name is required')).toBeVisible();
    await expect(page.getByText('Dosage is required')).toBeVisible();
    await expect(page.getByText('Quantity is required')).toBeVisible();
    await expect(page.getByText('Instructions are required')).toBeVisible();
    await expect(page.getByText('Refills authorized is required')).toBeVisible();
  });

  test('should submit prescription successfully', async ({ page }) => {
    // Search and select a patient
    await page.getByPlaceholder('Search patients...').fill('John');
    await page.getByText('John Doe').click();
    
    // Fill in prescription details
    await page.getByLabel('Medication Name *').fill('Amoxicillin 500mg');
    await page.getByLabel('Dosage *').fill('500mg, twice daily');
    await page.getByLabel('Quantity *').fill('20');
    await page.getByLabel('Instructions *').fill('Take with food');
    await page.getByLabel('Refills Authorized *').fill('2');
    await page.getByLabel('Prescription Notes').fill('Take as prescribed');
    
    // Submit prescription
    await page.getByRole('button', { name: 'Submit Prescription' }).click();
    
    // Check for success message
    await expect(page.getByText('Prescription submitted successfully')).toBeVisible();
    
    // Check that form is reset
    await expect(page.getByLabel('Medication Name *')).toHaveValue('');
    await expect(page.getByLabel('Dosage *')).toHaveValue('');
    await expect(page.getByLabel('Quantity *')).toHaveValue('');
  });

  test('should display prescription history', async ({ page }) => {
    // Navigate to prescription history tab
    await page.getByRole('tab', { name: 'Prescription History' }).click();
    
    // Check that prescription history is displayed
    await expect(page.getByText('Amoxicillin 500mg')).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('500mg, twice daily')).toBeVisible();
    await expect(page.getByText('20')).toBeVisible();
  });

  test('should handle search type changes', async ({ page }) => {
    // Change search type to name
    await page.getByLabel('Search by:').selectOption('name');
    
    // Verify search type changed
    await expect(page.getByDisplayValue('name')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    // Mock empty search results
    await page.route('**/api/doctor/patients**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });
    
    // Search for non-existent patient
    await page.getByPlaceholder('Search patients...').fill('NonExistent');
    
    // Check for no results message
    await expect(page.getByText('No patients found')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/doctor/patients**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    // Search for patients
    await page.getByPlaceholder('Search patients...').fill('John');
    
    // Check for error message
    await expect(page.getByText('Internal server error')).toBeVisible();
  });

  test('should validate form inputs correctly', async ({ page }) => {
    // Search and select a patient
    await page.getByPlaceholder('Search patients...').fill('John');
    await page.getByText('John Doe').click();
    
    // Fill in other required fields
    await page.getByLabel('Medication Name *').fill('Amoxicillin 500mg');
    await page.getByLabel('Dosage *').fill('500mg, twice daily');
    await page.getByLabel('Instructions *').fill('Take with food');
    await page.getByLabel('Refills Authorized *').fill('2');
    
    // Test invalid quantity
    await page.getByLabel('Quantity *').fill('-5');
    await page.getByRole('button', { name: 'Submit Prescription' }).click();
    await expect(page.getByText('Quantity must be a positive number')).toBeVisible();
    
    // Test invalid refills
    await page.getByLabel('Quantity *').fill('20');
    await page.getByLabel('Refills Authorized *').fill('-1');
    await page.getByRole('button', { name: 'Submit Prescription' }).click();
    await expect(page.getByText('Refills must be a non-negative number')).toBeVisible();
  });

  test('should show loading states during operations', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/doctor/patients**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });
    
    // Search for patients
    await page.getByPlaceholder('Search patients...').fill('John');
    
    // Check for loading state
    await expect(page.getByText('Searching...')).toBeVisible();
  });

  test('should handle patient selection and deselection', async ({ page }) => {
    // Search for a patient
    await page.getByPlaceholder('Search patients...').fill('John');
    
    // Select first patient
    await page.getByText('John Doe').click();
    await expect(page.getByText('Submit Prescription for John Doe')).toBeVisible();
    
    // Select different patient
    await page.getByText('Jane Smith').click();
    await expect(page.getByText('Submit Prescription for Jane Smith')).toBeVisible();
    
    // Clear selection by searching again
    await page.getByPlaceholder('Search patients...').fill('');
    await expect(page.getByText('Please select a patient to submit a prescription')).toBeVisible();
  });
});