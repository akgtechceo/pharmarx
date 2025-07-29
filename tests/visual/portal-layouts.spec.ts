import { test, expect } from '@playwright/test';

test.describe('Portal Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport and disable animations for stable screenshots
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: -0.01ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          transition-delay: -0.01ms !important;
        }
      `;
      document.head.appendChild(style);
    });
  });

  test.describe('Patient Portal Visual Tests', () => {
    test('patient portal desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
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

      await page.goto('/portal/patient');
      await page.waitForLoadState('networkidle');
      
      // Wait for all content to load
      await expect(page.locator('text=Current Medications')).toBeVisible();
      await expect(page.locator('text=Health Tracking')).toBeVisible();
      
      await expect(page).toHaveScreenshot('patient-portal-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('patient portal tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
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
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Current Medications')).toBeVisible();
      
      await expect(page).toHaveScreenshot('patient-portal-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('patient portal mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
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
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Current Medications')).toBeVisible();
      
      await expect(page).toHaveScreenshot('patient-portal-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Caregiver Portal Visual Tests', () => {
    test('caregiver portal desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'caregiver123',
              role: 'caregiver',
              displayName: 'Jane Caregiver'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/caregiver');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Your Patients')).toBeVisible();
      await expect(page.locator('text=Care Coordination')).toBeVisible();
      
      await expect(page).toHaveScreenshot('caregiver-portal-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('caregiver portal mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'caregiver123',
              role: 'caregiver',
              displayName: 'Jane Caregiver'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/caregiver');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Your Patients')).toBeVisible();
      
      await expect(page).toHaveScreenshot('caregiver-portal-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Doctor Portal Visual Tests', () => {
    test('doctor portal desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
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
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
      await expect(page.locator('text=Clinical Notes')).toBeVisible();
      
      await expect(page).toHaveScreenshot('doctor-portal-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('doctor portal tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
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
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
      
      await expect(page).toHaveScreenshot('doctor-portal-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Pharmacist Portal Visual Tests', () => {
    test('pharmacist portal desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'pharmacist123',
              role: 'pharmacist',
              displayName: 'PharmD Johnson'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/pharmacist');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
      await expect(page.locator('text=Processing Workflow')).toBeVisible();
      await expect(page.locator('text=Inventory Alerts')).toBeVisible();
      
      await expect(page).toHaveScreenshot('pharmacist-portal-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('pharmacist portal mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              uid: 'pharmacist123',
              role: 'pharmacist',
              displayName: 'PharmD Johnson'
            },
            isAuthenticated: true
          }
        }));
      });

      await page.goto('/portal/pharmacist');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Prescription Queue')).toBeVisible();
      
      await expect(page).toHaveScreenshot('pharmacist-portal-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Cross-Portal Navigation Visual Consistency', () => {
    test('header navigation consistency across portals', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      const portals = [
        { role: 'patient', path: '/portal/patient', title: 'Patient Portal' },
        { role: 'caregiver', path: '/portal/caregiver', title: 'Caregiver Portal' },
        { role: 'doctor', path: '/portal/doctor', title: 'Doctor Portal' },
        { role: 'pharmacist', path: '/portal/pharmacist', title: 'Pharmacist Portal' }
      ];

      for (const portal of portals) {
        await page.addInitScript((portalData) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${portalData.role}123`,
                role: portalData.role,
                displayName: `Test ${portalData.role}`
              },
              isAuthenticated: true
            }
          }));
        }, portal);

        await page.goto(portal.path);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of just the header area
        const header = page.locator('.bg-white.shadow-sm.border-b').first();
        await expect(header).toBeVisible();
        
        await expect(header).toHaveScreenshot(`${portal.role}-portal-header.png`, {
          animations: 'disabled'
        });
      }
    });

    test('welcome message sections visual consistency', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      const portals = [
        { role: 'patient', path: '/portal/patient', color: 'bg-blue-50' },
        { role: 'caregiver', path: '/portal/caregiver', color: 'bg-green-50' },
        { role: 'doctor', path: '/portal/doctor', color: 'bg-blue-50' },
        { role: 'pharmacist', path: '/portal/pharmacist', color: 'bg-purple-50' }
      ];

      for (const portal of portals) {
        await page.addInitScript((portalData) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${portalData.role}123`,
                role: portalData.role,
                displayName: `Test ${portalData.role}`
              },
              isAuthenticated: true
            }
          }));
        }, portal);

        await page.goto(portal.path);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of welcome message section
        const welcomeSection = page.locator(`[class*="${portal.color}"]`).first();
        await expect(welcomeSection).toBeVisible();
        
        await expect(welcomeSection).toHaveScreenshot(`${portal.role}-welcome-section.png`, {
          animations: 'disabled'
        });
      }
    });
  });

  test.describe('Component Visual Regression', () => {
    test('medication cards visual consistency', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
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
      await page.waitForLoadState('networkidle');
      
      // Screenshot individual medication cards
      const medicationCards = page.locator('[class*="border border-gray-200 rounded-lg p-4"]');
      await expect(medicationCards.first()).toBeVisible();
      
      await expect(medicationCards.first()).toHaveScreenshot('medication-card-active.png', {
        animations: 'disabled'
      });
      
      await expect(medicationCards.nth(1)).toHaveScreenshot('medication-card-refill-needed.png', {
        animations: 'disabled'
      });
    });

    test('status badges visual consistency', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      
      // Test different status badges across portals
      const testCases = [
        {
          role: 'patient',
          path: '/portal/patient',
          badges: ['Active', 'Refill Soon']
        },
        {
          role: 'caregiver',
          path: '/portal/caregiver',
          badges: ['2 Medications Due', 'All Up to Date', 'Appointment Needed']
        },
        {
          role: 'doctor',
          path: '/portal/doctor',
          badges: ['URGENT', 'Follow-up', 'Routine']
        },
        {
          role: 'pharmacist',
          path: '/portal/pharmacist',
          badges: ['PRIORITY', 'Consultation Required', 'Ready to Fill']
        }
      ];

      for (const testCase of testCases) {
        await page.addInitScript((portalData) => {
          window.localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: {
                uid: `${portalData.role}123`,
                role: portalData.role,
                displayName: `Test ${portalData.role}`
              },
              isAuthenticated: true
            }
          }));
        }, testCase);

        await page.goto(testCase.path);
        await page.waitForLoadState('networkidle');
        
        // Take screenshots of status badges
        for (const badge of testCase.badges) {
          const badgeElement = page.locator(`text=${badge}`).first();
          if (await badgeElement.isVisible()) {
            await expect(badgeElement).toHaveScreenshot(`${testCase.role}-badge-${badge.toLowerCase().replace(/\s+/g, '-')}.png`, {
              animations: 'disabled'
            });
          }
        }
      }
    });

    test('dashboard grid layouts responsive behavior', async ({ page }) => {
      const viewports = [
        { width: 1440, height: 900, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
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
        await page.waitForLoadState('networkidle');
        
        const dashboardGrid = page.locator('[class*="grid grid-cols-1 lg:grid-cols-3"]').first();
        await expect(dashboardGrid).toBeVisible();
        
        await expect(dashboardGrid).toHaveScreenshot(`doctor-dashboard-grid-${viewport.name}.png`, {
          animations: 'disabled'
        });
      }
    });
  });
}); 