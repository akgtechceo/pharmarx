import { test, expect } from '@playwright/test';

test.describe('Enhanced Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('Patient Portal Enhanced Features', () => {
    test('should display comprehensive patient dashboard after login', async ({ page }) => {
      // Mock user authentication as patient
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'patient123',
              role: 'patient',
              displayName: 'John Patient',
              email: 'patient@test.com'
            },
            isAuthenticated: true
          }
        }));
      });

      // Navigate to patient portal
      await page.goto('/portal/patient');

      // Verify header navigation
      await expect(page.locator('text=Patient Portal')).toBeVisible();
      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Logout')).toBeVisible();

      // Verify personalized welcome message
      await expect(page.locator('text=Welcome back, Patient!')).toBeVisible();
      await expect(page.locator('text=personalized health dashboard')).toBeVisible();

      // Verify current medications section
      await expect(page.locator('text=Current Medications')).toBeVisible();
      await expect(page.locator('text=Metformin 500mg')).toBeVisible();
      await expect(page.locator('text=Take twice daily with meals')).toBeVisible();
      await expect(page.locator('text=Active')).toBeVisible();
      await expect(page.locator('text=Refill Soon')).toBeVisible();

      // Verify prescription history
      await expect(page.locator('text=Recent Prescription History')).toBeVisible();
      await expect(page.locator('text=Filled at CVS Pharmacy')).toBeVisible();

      // Verify upcoming appointments
      await expect(page.locator('text=Upcoming Appointments')).toBeVisible();
      await expect(page.locator('text=Dr. Smith')).toBeVisible();
      await expect(page.locator('text=Diabetes Check-up')).toBeVisible();

      // Verify health tracking
      await expect(page.locator('text=Health Tracking')).toBeVisible();
      await expect(page.locator('text=Blood Pressure')).toBeVisible();
      await expect(page.locator('text=120/80')).toBeVisible();

      // Test interactive elements
      await page.click('text=Schedule New Appointment');
      await page.click('text=Request Prescription Refill');
    });

    test('should navigate back to home correctly', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { uid: 'patient123', role: 'patient', displayName: 'John Patient' },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/patient');
      await page.click('text=← Back to Home');
      await expect(page.locator('text=PharmaRx')).toBeVisible();
    });
  });

  test.describe('Caregiver Portal Enhanced Features', () => {
    test('should display multi-patient management dashboard', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'caregiver123',
              role: 'caregiver',
              displayName: 'Jane Caregiver',
              email: 'caregiver@test.com'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/caregiver');

      // Verify caregiver-specific navigation
      await expect(page.locator('text=Caregiver Portal')).toBeVisible();
      await expect(page.locator('text=Managing: 3 Patients')).toBeVisible();

      // Verify patient list
      await expect(page.locator('text=Your Patients')).toBeVisible();
      await expect(page.locator('text=Mary Johnson (Mother)')).toBeVisible();
      await expect(page.locator('text=2 Medications Due')).toBeVisible();
      await expect(page.locator('text=Robert Johnson (Spouse)')).toBeVisible();
      await expect(page.locator('text=All Up to Date')).toBeVisible();
      await expect(page.locator('text=Emma Thompson (Daughter)')).toBeVisible();
      await expect(page.locator('text=Appointment Needed')).toBeVisible();

      // Verify care coordination
      await expect(page.locator('text=Care Coordination')).toBeVisible();
      await expect(page.locator('text=Mary Johnson - Diabetes Care Plan')).toBeVisible();
      await expect(page.locator('text=Blood sugar monitoring: On track')).toBeVisible();
      await expect(page.locator('text=Medication adherence: Needs attention')).toBeVisible();

      // Verify daily tasks
      await expect(page.locator('text=Today\'s Tasks')).toBeVisible();
      await expect(page.locator('text=Remind Mary to take morning insulin')).toBeVisible();

      // Verify communication center
      await expect(page.locator('text=Messages')).toBeVisible();
      await expect(page.locator('text=Dr. Smith')).toBeVisible();
      await expect(page.locator('text=Mary\'s test results are ready')).toBeVisible();

      // Test interactive elements
      await page.click('text=Add Patient');
      await page.click('text=Emergency Contact List');
    });
  });

  test.describe('Doctor Portal Enhanced Features', () => {
    test('should display clinical management dashboard', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'doctor123',
              role: 'doctor',
              displayName: 'Dr. Smith',
              email: 'doctor@test.com'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/doctor');

      // Verify doctor-specific navigation
      await expect(page.locator('text=Doctor Portal')).toBeVisible();
      await expect(page.locator('text=Dr. Smith • 12 Patients Today')).toBeVisible();

      // Verify today's schedule
      await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
      await expect(page.locator('text=Sarah Williams')).toBeVisible();
      await expect(page.locator('text=URGENT')).toBeVisible();
      await expect(page.locator('text=Diabetes management consultation')).toBeVisible();
      await expect(page.locator('text=HbA1c: 8.2% (High)')).toBeVisible();

      // Verify prescription queue
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
      await expect(page.locator('text=Write New Prescription')).toBeVisible();
      await expect(page.locator('text=Refill Request - Sarah Williams')).toBeVisible();
      await expect(page.locator('text=Metformin 500mg • 90-day supply')).toBeVisible();

      // Verify clinical notes
      await expect(page.locator('text=Recent Clinical Notes')).toBeVisible();
      await expect(page.locator('text=Sarah Williams - Diabetes Follow-up')).toBeVisible();
      await expect(page.locator('text=Patient reports improved glucose control')).toBeVisible();

      // Verify patient search
      await expect(page.locator('text=Patient Search')).toBeVisible();
      await expect(page.locator('placeholder=Search by name, ID, or phone...')).toBeVisible();

      // Verify alerts system
      await expect(page.locator('text=Alerts')).toBeVisible();
      await expect(page.locator('text=Critical Lab Value')).toBeVisible();
      await expect(page.locator('text=S. Williams - HbA1c: 8.2%')).toBeVisible();

      // Test interactive elements
      await page.click('text=Approve');
      await page.click('text=Write New Prescription');
      await page.fill('placeholder=Search by name, ID, or phone...', 'Sarah Williams');
      await page.click('text=Search Patients');
    });
  });

  test.describe('Pharmacist Portal Enhanced Features', () => {
    test('should display prescription processing workflow', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'pharmacist123',
              role: 'pharmacist',
              displayName: 'PharmD Johnson',
              email: 'pharmacist@test.com'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/pharmacist');

      // Verify pharmacist-specific navigation
      await expect(page.locator('text=Pharmacist Portal')).toBeVisible();
      await expect(page.locator('text=PharmD Johnson • 15 Orders in Queue')).toBeVisible();

      // Verify prescription queue
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
      await expect(page.locator('text=Process Next')).toBeVisible();
      await expect(page.locator('text=Sarah Williams')).toBeVisible();
      await expect(page.locator('text=PRIORITY')).toBeVisible();
      await expect(page.locator('text=Consultation Required')).toBeVisible();
      await expect(page.locator('text=Drug interaction alert')).toBeVisible();

      // Verify processing workflow
      await expect(page.locator('text=Processing Workflow')).toBeVisible();
      await expect(page.locator('text=Received')).toBeVisible();
      await expect(page.locator('text=Verified')).toBeVisible();
      await expect(page.locator('text=Filling')).toBeVisible();
      await expect(page.locator('text=Ready')).toBeVisible();

      // Verify counseling sessions
      await expect(page.locator('text=Recent Counseling Sessions')).toBeVisible();
      await expect(page.locator('text=Sarah Williams - Diabetes Medication Education')).toBeVisible();
      await expect(page.locator('text=Discussed proper metformin administration')).toBeVisible();

      // Verify inventory alerts
      await expect(page.locator('text=Inventory Alerts')).toBeVisible();
      await expect(page.locator('text=Low Stock Alert')).toBeVisible();
      await expect(page.locator('text=Metformin 500mg: 5 units remaining')).toBeVisible();

      // Verify daily statistics
      await expect(page.locator('text=Today\'s Statistics')).toBeVisible();
      await expect(page.locator('text=Prescriptions Filled')).toBeVisible();
      await expect(page.locator('text=47')).toBeVisible();

      // Test interactive elements
      const fillButtons = page.locator('text=Fill');
      await expect(fillButtons.first()).toBeVisible();
      await fillButtons.first().click();
      
      await page.click('text=Consult');
      await page.fill('placeholder=Search by drug name or NDC...', 'Metformin');
      await page.click('text=Search Database');
      await page.click('text=Manage Inventory');
    });
  });

  test.describe('Cross-Portal Navigation and Consistency', () => {
    test('should maintain consistent navigation across all portals', async ({ page }) => {
      const portals = [
        { role: 'patient', path: '/portal/patient', title: 'Patient Portal', color: 'text-blue-600' },
        { role: 'caregiver', path: '/portal/caregiver', title: 'Caregiver Portal', color: 'text-green-600' },
        { role: 'doctor', path: '/portal/doctor', title: 'Doctor Portal', color: 'text-blue-700' },
        { role: 'pharmacist', path: '/portal/pharmacist', title: 'Pharmacist Portal', color: 'text-purple-700' }
      ];

      for (const portal of portals) {
        await page.addInitScript((portalData) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${portalData.role}123`,
                role: portalData.role,
                displayName: `Test ${portalData.role}`,
                email: `${portalData.role}@test.com`
              },
              isAuthenticated: true
            }
          }));
        }, portal);

        await page.goto(portal.path);

        // Check consistent navigation elements
        await expect(page.locator('text=PharmaRx')).toBeVisible();
        await expect(page.locator(`text=${portal.title}`)).toBeVisible();
        await expect(page.locator('text=Profile')).toBeVisible();
        await expect(page.locator('text=Logout')).toBeVisible();
        await expect(page.locator('text=← Back to Home')).toBeVisible();

        // Verify role-specific welcome message
        await expect(page.locator(`text=Welcome`)).toBeVisible();
      }
    });

    test('should handle logout functionality across all portals', async ({ page }) => {
      const portals = ['/portal/patient', '/portal/caregiver', '/portal/doctor', '/portal/pharmacist'];

      for (const portalPath of portals) {
        const role = portalPath.split('/').pop();
        
        await page.addInitScript((userRole) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${userRole}123`,
                role: userRole,
                displayName: `Test ${userRole}`,
                email: `${userRole}@test.com`
              },
              isAuthenticated: true
            }
          }));
        }, role);

        await page.goto(portalPath);
        
        // Test logout button
        await expect(page.locator('text=Logout')).toBeVisible();
        await page.click('text=Logout');
        
        // Should redirect to home or login page
        await page.waitForURL('/');
      }
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should redirect unauthorized users', async ({ page }) => {
      // Test that patient cannot access doctor portal
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'patient123',
              role: 'patient',
              displayName: 'John Patient'
            },
            isAuthenticated: true
          }
        }));
      });

      // Try to access doctor portal
      await page.goto('/portal/doctor');
      
      // Should be redirected or show access denied
      // This depends on the ProtectedRoute implementation
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('should allow authorized users to access their portals', async ({ page }) => {
      const roles = ['patient', 'caregiver', 'doctor', 'pharmacist'];
      
      for (const role of roles) {
        await page.addInitScript((userRole) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${userRole}123`,
                role: userRole,
                displayName: `Test ${userRole}`
              },
              isAuthenticated: true
            }
          }));
        }, role);

        await page.goto(`/portal/${role}`);
        
        // Should successfully load the portal
        const portalTitle = `${role.charAt(0).toUpperCase() + role.slice(1)} Portal`;
        await expect(page.locator(`text=${portalTitle}`)).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'patient123',
              role: 'patient',
              displayName: 'John Patient'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/patient');

      // Verify mobile-responsive layout
      await expect(page.locator('text=Patient Portal')).toBeVisible();
      await expect(page.locator('text=Current Medications')).toBeVisible();
      
      // Check that grid layout adapts to mobile
      const dashboard = page.locator('[class*="grid"]');
      await expect(dashboard).toBeVisible();
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'doctor123',
              role: 'doctor',
              displayName: 'Dr. Smith'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/doctor');

      // Verify tablet layout
      await expect(page.locator('text=Doctor Portal')).toBeVisible();
      await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
    });
  });
}); 