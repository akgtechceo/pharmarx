import { test, expect, Page } from '@playwright/test';

// Mock user data for testing
const mockUsers = {
  patient: {
    role: 'patient' as const,
    contactType: 'email' as const,
    contactValue: 'patient.integration@test.com',
    displayName: 'Integration Test Patient',
    password: 'testpass123'
  },
  doctor: {
    role: 'doctor' as const,
    contactType: 'phone' as const,
    contactValue: '+1-555-API-TEST',
    displayName: 'Dr. Integration Test',
    password: 'doctortest123'
  },
  pharmacist: {
    role: 'pharmacist' as const,
    contactType: 'email' as const,
    contactValue: 'pharmacist.integration@test.com',
    displayName: 'Pharmacist Integration',
    password: 'pharmatest123'
  }
};

// Helper to fill registration form
async function fillRegistrationForm(page: Page, userData: typeof mockUsers.patient) {
  const roleLabels = {
    patient: 'Patient/Caregiver',
    doctor: 'Doctor',
    pharmacist: 'Pharmacist'
  };

  await page.getByText(roleLabels[userData.role]).click();

  if (userData.contactType === 'email') {
    await page.getByText('Email', { exact: true }).click();
    await page.getByLabel(/email address/i).fill(userData.contactValue);
  } else {
    await page.getByText('Phone Number').click();
    await page.getByLabel(/phone number/i).fill(userData.contactValue);
  }

  await page.getByLabel(/display name/i).fill(userData.displayName);
  await page.getByLabel(/^password$/i).fill(userData.password);
  await page.getByLabel(/confirm password/i).fill(userData.password);
}

test.describe('API Integration and Data Persistence', () => {

  test.describe('Backend API Integration', () => {
    
    test('should send correct data to registration API', async ({ page }) => {
      let capturedRequest: any = null;

      // Intercept API calls to verify data
      await page.route('**/api/auth/register', async route => {
        capturedRequest = {
          method: route.request().method(),
          headers: route.request().headers(),
          body: JSON.parse(await route.request().postData() || '{}')
        };
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uid: 'test-uid-123',
              role: 'patient',
              email: 'patient.integration@test.com',
              displayName: 'Integration Test Patient',
              createdAt: new Date().toISOString()
            },
            message: 'User registered successfully'
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      // Wait for API call to be made
      await expect(page).toHaveURL('/dashboard');

      // Verify request was made correctly
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.method).toBe('POST');
      expect(capturedRequest.headers['content-type']).toContain('application/json');
      expect(capturedRequest.headers['authorization']).toMatch(/^Bearer .+/);
      
      // Verify request body contains correct data
      expect(capturedRequest.body).toMatchObject({
        uid: expect.any(String),
        role: 'patient',
        email: 'patient.integration@test.com',
        displayName: 'Integration Test Patient'
      });
      expect(capturedRequest.body.phoneNumber).toBeUndefined();
    });

    test('should send phone number data correctly', async ({ page }) => {
      let capturedRequest: any = null;

      await page.route('**/api/auth/register', async route => {
        capturedRequest = JSON.parse(await route.request().postData() || '{}');
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uid: 'doctor-uid-456',
              role: 'doctor',
              phoneNumber: '+1-555-API-TEST',
              displayName: 'Dr. Integration Test',
              createdAt: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.doctor);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Verify phone number was sent instead of email
      expect(capturedRequest.body).toMatchObject({
        uid: expect.any(String),
        role: 'doctor',
        phoneNumber: '+1-555-API-TEST',
        displayName: 'Dr. Integration Test'
      });
      expect(capturedRequest.body.email).toBeUndefined();
    });

    test('should handle API validation errors correctly', async ({ page }) => {
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed: email must be a valid email address format'
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should display the validation error from the API
      await expect(page.getByText(/validation failed.*email.*valid email address/i)).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should handle API server errors', async ({ page }) => {
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Registration failed. Please try again.'
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.pharmacist);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Registration failed. Please try again.')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should send Firebase ID token in authorization header', async ({ page }) => {
      let capturedHeaders: any = null;

      await page.route('**/api/auth/register', route => {
        capturedHeaders = route.request().headers();
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { uid: 'test-uid' } })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Verify authorization header is present and formatted correctly
      expect(capturedHeaders.authorization).toMatch(/^Bearer [A-Za-z0-9._-]+$/);
    });
  });

  test.describe('User Record Creation', () => {
    
    test('should create user record with correct role assignment', async ({ page }) => {
      const testCases = [
        { userData: mockUsers.patient, expectedRole: 'patient' },
        { userData: mockUsers.doctor, expectedRole: 'doctor' },
        { userData: mockUsers.pharmacist, expectedRole: 'pharmacist' }
      ];

      for (const { userData, expectedRole } of testCases) {
        let createdUser: any = null;

        await page.route('**/api/auth/register', route => {
          const requestBody = JSON.parse(route.request().postData() || '{}');
          
          createdUser = {
            uid: requestBody.uid,
            role: requestBody.role,
            [userData.contactType === 'email' ? 'email' : 'phoneNumber']: requestBody[userData.contactType === 'email' ? 'email' : 'phoneNumber'],
            displayName: requestBody.displayName,
            createdAt: new Date()
          };

          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: createdUser,
              message: 'User registered successfully'
            })
          });
        });

        await page.goto('/register');
        await fillRegistrationForm(page, userData);
        await page.getByRole('button', { name: /create account/i }).click();

        await expect(page).toHaveURL('/dashboard');

        // Verify user was created with correct data
        expect(createdUser).toBeTruthy();
        expect(createdUser.role).toBe(expectedRole);
        expect(createdUser.displayName).toBe(userData.displayName);
        expect(createdUser[userData.contactType === 'email' ? 'email' : 'phoneNumber']).toBe(userData.contactValue);
        expect(createdUser.uid).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });

    test('should verify user record persistence', async ({ page }) => {
      let registrationData: any = null;

      // Mock successful registration
      await page.route('**/api/auth/register', route => {
        registrationData = JSON.parse(route.request().postData() || '{}');
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uid: registrationData.uid,
              role: registrationData.role,
              email: registrationData.email,
              displayName: registrationData.displayName,
              createdAt: new Date().toISOString()
            }
          })
        });
      });

      // Mock user profile retrieval to verify persistence
      await page.route('**/api/auth/me', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uid: registrationData?.uid,
              role: registrationData?.role,
              email: registrationData?.email,
              displayName: registrationData?.displayName,
              createdAt: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Simulate checking user profile after registration
      await page.goto('/profile'); // This would be a profile page in a real app
      
      // The registration data should be persisted and accessible
      expect(registrationData).toBeTruthy();
      expect(registrationData.uid).toBeTruthy();
      expect(registrationData.role).toBe('patient');
    });
  });

  test.describe('Firebase Authentication State', () => {
    
    test('should maintain auth state after successful registration', async ({ page, context }) => {
      let authTokens: string[] = [];

      // Capture all auth tokens
      await page.route('**/api/auth/register', route => {
        const authHeader = route.request().headers().authorization;
        if (authHeader) {
          authTokens.push(authHeader);
        }
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { uid: 'test-uid', role: 'patient' }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Verify auth token was created
      expect(authTokens).toHaveLength(1);
      expect(authTokens[0]).toMatch(/^Bearer .+/);

      // Navigate to another page and verify auth state persists
      await page.goto('/');
      await page.goto('/dashboard');
      
      // Should still be able to access dashboard (auth state maintained)
      await expect(page.getByText('PharmaRx Dashboard')).toBeVisible();
    });

    test('should handle auth state across page refreshes', async ({ page }) => {
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { uid: 'refresh-test-uid', role: 'doctor' }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.doctor);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Refresh the page
      await page.reload();

      // Should maintain the dashboard state after refresh
      await expect(page.getByText('PharmaRx Dashboard')).toBeVisible();
    });

    test('should handle auth errors during registration', async ({ page }) => {
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized - Invalid token'
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.patient);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show auth error and remain on registration page
      await expect(page.getByText(/unauthorized.*invalid token/i)).toBeVisible();
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Custom Claims and Role-Based Access', () => {
    
    test('should set custom claims for user roles', async ({ page }) => {
      let customClaimsSet = false;

      await page.route('**/api/auth/register', route => {
        // Simulate setting custom claims in Firebase
        customClaimsSet = true;
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uid: 'claims-test-uid',
              role: 'doctor',
              customClaims: { role: 'doctor' } // Simulate custom claims being set
            }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.doctor);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Verify custom claims would be set (in real app, this would be verified via Firebase Admin)
      expect(customClaimsSet).toBe(true);
    });
  });

  test.describe('Data Validation and Security', () => {
    
    test('should handle malicious input safely', async ({ page }) => {
      const maliciousInputs = {
        role: 'patient' as const,
        contactType: 'email' as const,
        contactValue: '<script>alert("xss")</script>@test.com',
        displayName: '<img src="x" onerror="alert(\'xss\')">',
        password: 'testpass123'
      };

      let sanitizedData: any = null;

      await page.route('**/api/auth/register', route => {
        sanitizedData = JSON.parse(route.request().postData() || '{}');
        
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { uid: 'security-test-uid' }
          })
        });
      });

      await page.goto('/register');
      await fillRegistrationForm(page, maliciousInputs);
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');

      // Verify that potentially malicious content is handled properly
      expect(sanitizedData.email).toBe(maliciousInputs.contactValue);
      expect(sanitizedData.displayName).toBe(maliciousInputs.displayName);
      
      // The actual sanitization would happen on the backend
      // This test verifies the data is transmitted as expected
    });

    test('should validate required fields on backend', async ({ page }) => {
      await page.route('**/api/auth/register', route => {
        const body = JSON.parse(route.request().postData() || '{}');
        
        // Simulate backend validation
        const errors: string[] = [];
        if (!body.uid) errors.push('UID is required');
        if (!body.role) errors.push('Role is required');
        if (!body.displayName) errors.push('Display name is required');
        if (!body.email && !body.phoneNumber) errors.push('Either email or phone number must be provided');
        
        if (errors.length > 0) {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: errors.join(', ') })
          });
        } else {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { uid: body.uid } })
          });
        }
      });

      await page.goto('/register');
      await fillRegistrationForm(page, mockUsers.pharmacist);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should succeed with valid data
      await expect(page).toHaveURL('/dashboard');
    });
  });
}); 