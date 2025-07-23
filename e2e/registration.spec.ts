import { test, expect, Page } from '@playwright/test';

// Helper function to fill out the registration form
async function fillRegistrationForm(
  page: Page,
  options: {
    role: 'patient' | 'doctor' | 'pharmacist';
    contactType: 'email' | 'phone';
    contactValue: string;
    displayName: string;
    password: string;
    confirmPassword?: string;
  }
) {
  // Select role
  const roleLabels = {
    patient: 'Patient/Caregiver',
    doctor: 'Doctor', 
    pharmacist: 'Pharmacist'
  };
  await page.getByText(roleLabels[options.role]).click();

  // Select contact type
  if (options.contactType === 'email') {
    await page.getByText('Email', { exact: true }).click();
    await page.getByLabel(/email address/i).fill(options.contactValue);
  } else {
    await page.getByText('Phone Number').click();
    await page.getByLabel(/phone number/i).fill(options.contactValue);
  }

  // Fill other fields
  await page.getByLabel(/display name/i).fill(options.displayName);
  await page.getByLabel(/^password$/i).fill(options.password);
  await page.getByLabel(/confirm password/i).fill(options.confirmPassword || options.password);
}

// Helper function to clear form
async function clearForm(page: Page) {
  await page.getByLabel(/display name/i).fill('');
  await page.getByLabel(/^password$/i).fill('');
  await page.getByLabel(/confirm password/i).fill('');
  
  // Clear email or phone based on current selection
  const emailField = page.getByLabel(/email address/i);
  const phoneField = page.getByLabel(/phone number/i);
  
  if (await emailField.isVisible()) {
    await emailField.fill('');
  }
  if (await phoneField.isVisible()) {
    await phoneField.fill('');
  }
}

test.describe('User Registration Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page before each test
    await page.goto('/register');
    
    // Wait for page to fully load
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test.describe('Patient/Caregiver Registration', () => {
    
    test('should successfully register Patient with email', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'patient@example.com',
        displayName: 'John Patient',
        password: 'securePass123'
      });

      // Submit the form
      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to dashboard on success
      await expect(page).toHaveURL('/dashboard');
      
      // Should show success message
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
      
      // Should display dashboard content
      await expect(page.getByText('PharmaRx Dashboard')).toBeVisible();
    });

    test('should successfully register Caregiver with phone number', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient', // Patient/Caregiver share the same role value
        contactType: 'phone',
        contactValue: '+1 (555) 123-4567',
        displayName: 'Jane Caregiver',
        password: 'caregiver123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
    });
  });

  test.describe('Doctor Registration', () => {
    
    test('should successfully register Doctor with phone number', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'doctor',
        contactType: 'phone',
        contactValue: '+1 (555) 987-6543',
        displayName: 'Dr. Sarah Smith',
        password: 'doctorPass456'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
    });

    test('should successfully register Doctor with email', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'doctor',
        contactType: 'email',
        contactValue: 'doctor@hospital.com',
        displayName: 'Dr. Michael Johnson',
        password: 'medicalPass789'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
    });
  });

  test.describe('Pharmacist Registration', () => {
    
    test('should successfully register Pharmacist with email', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'pharmacist',
        contactType: 'email',
        contactValue: 'pharmacist@pharmacy.com',
        displayName: 'Alex Pharmacist',
        password: 'pharmaPass321'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
    });

    test('should successfully register Pharmacist with phone number', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'pharmacist',
        contactType: 'phone',
        contactValue: '+1-800-PHARMA',
        displayName: 'Chris PharmD',
        password: 'pharmacy456'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Registration successful! Welcome to PharmaRx.')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    
    test('should show validation errors for empty required fields', async ({ page }) => {
      // Try to submit without filling anything
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show validation errors
      await expect(page.getByText('Display name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
      
      // Should not redirect
      await expect(page).toHaveURL('/register');
    });

    test('should validate email format', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'invalid-email',
        displayName: 'Test User',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should validate phone number format', async ({ page }) => {
      // Switch to phone number
      await page.getByText('Phone Number').click();
      
      await fillRegistrationForm(page, {
        role: 'doctor',
        contactType: 'phone',
        contactValue: 'invalid-phone#$%',
        displayName: 'Dr. Test',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should validate password confirmation', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        confirmPassword: 'different-password'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Passwords do not match')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should validate minimum password length', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'test@example.com',
        displayName: 'Test User',
        password: '123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should validate display name minimum length', async ({ page }) => {
      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'test@example.com',
        displayName: 'A',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('Display name must be at least 2 characters')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Role Selection', () => {
    
    test('should default to Patient role', async ({ page }) => {
      const patientRadio = page.getByDisplayValue('patient');
      await expect(patientRadio).toBeChecked();
    });

    test('should allow role selection changes', async ({ page }) => {
      // Initially Patient should be selected
      await expect(page.getByDisplayValue('patient')).toBeChecked();

      // Select Doctor
      await page.getByText('Doctor').click();
      await expect(page.getByDisplayValue('doctor')).toBeChecked();

      // Select Pharmacist
      await page.getByText('Pharmacist').click();
      await expect(page.getByDisplayValue('pharmacist')).toBeChecked();
    });

    test('should show role descriptions', async ({ page }) => {
      await expect(page.getByText('Manage prescriptions and health records')).toBeVisible();
      await expect(page.getByText('Prescribe medications and manage patients')).toBeVisible();
      await expect(page.getByText('Dispense medications and provide consultations')).toBeVisible();
    });
  });

  test.describe('Contact Type Toggle', () => {
    
    test('should default to email contact type', async ({ page }) => {
      const emailRadio = page.getByDisplayValue('email');
      await expect(emailRadio).toBeChecked();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/phone number/i)).not.toBeVisible();
    });

    test('should switch between email and phone', async ({ page }) => {
      // Initially email should be shown
      await expect(page.getByLabel(/email address/i)).toBeVisible();

      // Switch to phone
      await page.getByText('Phone Number').click();
      await expect(page.getByLabel(/phone number/i)).toBeVisible();
      await expect(page.getByLabel(/email address/i)).not.toBeVisible();

      // Switch back to email
      await page.getByText('Email', { exact: true }).click();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/phone number/i)).not.toBeVisible();
    });
  });

  test.describe('Form Loading States', () => {
    
    test('should show loading state during submission', async ({ page }) => {
      // Mock a slow network response
      await page.route('**/api/auth/register', async route => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { uid: 'test-uid' } })
        });
      });

      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'test@example.com',
        displayName: 'Test User',
        password: 'password123'
      });

      // Start submission
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show loading state
      await expect(page.getByRole('button', { name: /creating account/i })).toBeVisible();
      
      // Form fields should be disabled during loading
      await expect(page.getByLabel(/email address/i)).toBeDisabled();
      await expect(page.getByLabel(/display name/i)).toBeDisabled();
      await expect(page.getByLabel(/^password$/i)).toBeDisabled();
      await expect(page.getByLabel(/confirm password/i)).toBeDisabled();
    });
  });

  test.describe('Navigation and Links', () => {
    
    test('should have working navigation links', async ({ page }) => {
      // Check Terms of Service link
      const termsLink = page.getByText('Terms of Service');
      await expect(termsLink).toBeVisible();
      await termsLink.click();
      await expect(page).toHaveURL('/terms');
      await expect(page.getByText('Terms of Service content coming soon...')).toBeVisible();

      // Go back to registration
      await page.goBack();
      await expect(page).toHaveURL('/register');

      // Check Privacy Policy link
      const privacyLink = page.getByText('Privacy Policy');
      await expect(privacyLink).toBeVisible();
      await privacyLink.click();
      await expect(page).toHaveURL('/privacy');
      await expect(page.getByText('Privacy Policy content coming soon...')).toBeVisible();

      // Go back to registration
      await page.goBack();
      await expect(page).toHaveURL('/register');

      // Check Sign in link
      const signInLink = page.getByText('Sign in here');
      await expect(signInLink).toBeVisible();
      await signInLink.click();
      await expect(page).toHaveURL('/login');
      await expect(page.getByText('Login page coming soon...')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/auth/register', route => {
        route.abort('failed');
      });

      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'test@example.com',
        displayName: 'Test User',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      // Should show network error
      await expect(page.getByText(/network error/i)).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should handle server errors', async ({ page }) => {
      // Mock server error response
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await fillRegistrationForm(page, {
        role: 'doctor',
        contactType: 'email',
        contactValue: 'doctor@example.com',
        displayName: 'Dr. Test',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      // Should show server error
      await expect(page.getByText(/internal server error/i)).toBeVisible();
      await expect(page).toHaveURL('/register');
    });

    test('should handle existing user error', async ({ page }) => {
      // Mock user already exists error
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'User already exists' })
        });
      });

      await fillRegistrationForm(page, {
        role: 'patient',
        contactType: 'email',
        contactValue: 'existing@example.com',
        displayName: 'Existing User',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('User already exists')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Authentication Integration', () => {
    
    test('should handle Firebase Auth errors', async ({ page }) => {
      // Mock Firebase Auth error
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'An account with this email already exists.' })
        });
      });

      await fillRegistrationForm(page, {
        role: 'pharmacist',
        contactType: 'email',
        contactValue: 'duplicate@example.com',
        displayName: 'Duplicate User',
        password: 'password123'
      });

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText('An account with this email already exists.')).toBeVisible();
      await expect(page).toHaveURL('/register');
    });
  });
}); 