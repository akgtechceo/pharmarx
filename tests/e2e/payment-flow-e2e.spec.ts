import { test, expect, Page } from '@playwright/test';

// Mock API responses for testing
const mockOrderData = {
  orderId: 'test-order-e2e-001',
  status: 'awaiting_payment',
  cost: 45.50,
  medicationDetails: {
    name: 'Amoxicillin 500mg',
    quantity: 21,
    dosage: '500mg',
    instructions: 'Take one tablet three times daily'
  },
  pharmacyInfo: {
    name: 'PharmaRx Test Pharmacy',
    address: '123 Test Street, Cotonou, Benin',
    phone: '+229 21 30 45 67'
  }
};

const mockPaymentNotification = {
  orderId: mockOrderData.orderId,
  status: 'awaiting_payment',
  calculatedCost: 45.50,
  medicationDetails: mockOrderData.medicationDetails,
  pharmacyInfo: mockOrderData.pharmacyInfo,
  estimatedDelivery: {
    timeframe: '2-3 jours ouvrables',
    description: 'Livraison à domicile standard'
  },
  approvedAt: new Date()
};

const mockReceipt = {
  receiptId: 'receipt-e2e-001',
  receiptNumber: 'BJ-2024-E2E001',
  paymentId: 'payment-e2e-001',
  receiptDetails: {
    receiptNumber: 'BJ-2024-E2E001',
    issueDate: new Date(),
    taxRate: 0.18,
    taxAmount: 6.93,
    subtotalAmount: 38.57,
    totalAmount: 45.50,
    currency: 'USD',
    pharmacyInfo: mockOrderData.pharmacyInfo,
    medicationDetails: [{
      name: 'Amoxicillin 500mg',
      quantity: 21,
      unitPrice: 1.84,
      totalPrice: 38.57,
      prescription: true
    }]
  }
};

test.describe('Complete Payment Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints
    await page.route('**/api/orders/*/payment-notification', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockPaymentNotification,
          message: 'Payment notification retrieved successfully'
        })
      });
    });

    await page.route('**/api/orders/*/pay', async route => {
      const requestBody = await route.request().postDataJSON();
      
      if (requestBody.paymentData.cardNumber === '4000000000000002') {
        // Simulate card declined
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Card declined by issuer'
          })
        });
      } else {
        // Simulate successful payment
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              paymentId: 'payment-e2e-001',
              transactionId: 'ch_e2e_test123',
              status: 'succeeded'
            },
            message: 'Payment processed successfully'
          })
        });
      }
    });

    await page.route('**/api/payments/*/receipt', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockReceipt,
          message: 'Receipt details retrieved successfully'
        })
      });
    });

    await page.route('**/api/payments/*/receipt/download', async route => {
      // Mock PDF download
      const pdfBuffer = Buffer.from('Mock PDF content for E2E testing');
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="facture-BJ-2024-E2E001.pdf"'
        },
        body: pdfBuffer
      });
    });

    // Mock authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { token: 'mock-auth-token', userId: 'test-user-e2e' }
        })
      });
    });
  });

  test('Complete payment flow: notification → payment → receipt', async ({ page }) => {
    // Navigate to payment page
    await page.goto('/payment/test-order-e2e-001');

    // Step 1: Verify payment notification is displayed
    await expect(page.getByText('Commande approuvée')).toBeVisible();
    await expect(page.getByText('Order Approved')).toBeVisible();
    await expect(page.getByText('Amoxicillin 500mg')).toBeVisible();
    await expect(page.getByText('$45.50')).toBeVisible();
    await expect(page.getByText('PharmaRx Test Pharmacy')).toBeVisible();
    await expect(page.getByText('2-3 jours ouvrables')).toBeVisible();

    // Step 2: Proceed to payment
    await page.click('button:has-text("Procéder au paiement")');

    // Step 3: Verify payment method selection
    await expect(page.getByText('Choisissez votre méthode de paiement')).toBeVisible();
    await expect(page.getByText('Select your payment method')).toBeVisible();
    
    // Verify all payment methods are available
    await expect(page.getByText('Stripe')).toBeVisible();
    await expect(page.getByText('PayPal')).toBeVisible();
    await expect(page.getByText('MTN Mobile Money')).toBeVisible();

    // Step 4: Select Stripe payment method
    await page.click('[data-testid="payment-method-stripe"]');

    // Step 5: Fill payment form
    await expect(page.getByText('Informations de carte')).toBeVisible();
    
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');

    // Step 6: Verify order summary
    await expect(page.getByText('Résumé de la commande')).toBeVisible();
    await expect(page.getByText('test-order-e2e-001')).toBeVisible();
    await expect(page.getByText('$45.50')).toBeVisible();

    // Step 7: Process payment
    await page.click('button:has-text("Payer $45.50")');

    // Step 8: Verify loading state
    await expect(page.getByText('Traitement en cours')).toBeVisible();

    // Step 9: Verify successful payment
    await expect(page.getByText('Paiement réussi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Payment Successful')).toBeVisible();
    await expect(page.getByText('payment-e2e-001')).toBeVisible();

    // Step 10: View receipt
    await page.click('button:has-text("Voir la facture")');

    // Step 11: Verify receipt display
    await expect(page.getByText('Facture Normalisée')).toBeVisible();
    await expect(page.getByText('BJ-2024-E2E001')).toBeVisible();
    await expect(page.getByText('PharmaRx Test Pharmacy')).toBeVisible();
    await expect(page.getByText('Amoxicillin 500mg')).toBeVisible();
    await expect(page.getByText('TVA 18%')).toBeVisible();
    await expect(page.getByText('$6.93')).toBeVisible(); // Tax amount
    await expect(page.getByText('$45.50')).toBeVisible(); // Total

    // Step 12: Download receipt PDF
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("Télécharger PDF")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe('facture-BJ-2024-E2E001.pdf');
  });

  test('Payment failure handling and retry', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');

    // Proceed through notification to payment
    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-stripe"]');

    // Use declined card number
    await page.fill('[data-testid="card-number"]', '4000000000000002');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');

    await page.click('button:has-text("Payer $45.50")');

    // Verify error message
    await expect(page.getByText('Card declined by issuer')).toBeVisible();
    await expect(page.getByRole('button', { name: /réessayer/i })).toBeVisible();

    // Retry with valid card
    await page.click('button:has-text("Réessayer")');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.click('button:has-text("Payer $45.50")');

    // Verify successful retry
    await expect(page.getByText('Paiement réussi')).toBeVisible({ timeout: 10000 });
  });

  test('PayPal payment flow', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');

    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-paypal"]');

    // Verify PayPal-specific content
    await expect(page.getByText('Vous serez redirigé vers PayPal')).toBeVisible();
    await expect(page.getByText('You will be redirected to PayPal')).toBeVisible();

    await page.click('button:has-text("Continuer avec PayPal")');

    // In a real test, this would handle PayPal redirect
    // For E2E, we mock the successful return
    await expect(page.getByText('Paiement réussi')).toBeVisible({ timeout: 10000 });
  });

  test('MTN Mobile Money payment flow', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');

    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-mtn"]');

    // Verify MTN-specific content
    await expect(page.getByText('Numéro de téléphone')).toBeVisible();
    await expect(page.getByText('Format: +229 xx xx xx xx')).toBeVisible();

    await page.fill('[data-testid="phone-number"]', '+22996123456');
    await page.click('button:has-text("Payer avec MTN")');

    await expect(page.getByText('Paiement réussi')).toBeVisible({ timeout: 10000 });
  });

  test('Accessibility compliance throughout payment flow', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /procéder au paiement/i })).toBeFocused();

    await page.keyboard.press('Enter');

    // Test payment method selection with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select first payment method

    // Test form accessibility
    const cardNumberInput = page.getByLabelText(/numéro de carte/i);
    await expect(cardNumberInput).toBeVisible();
    await expect(cardNumberInput).toHaveAttribute('required');

    const expiryInput = page.getByLabelText(/date d'expiration/i);
    await expect(expiryInput).toBeVisible();
    await expect(expiryInput).toHaveAttribute('required');

    // Test ARIA labels and roles
    await expect(page.getByRole('form')).toBeVisible();
    await expect(page.getByRole('button', { name: /payer/i })).toBeVisible();

    // Test error announcement
    await page.fill('[data-testid="card-number"]', '4000000000000002');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    await page.click('button:has-text("Payer $45.50")');

    const errorMessage = page.getByRole('alert');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Card declined by issuer');
  });

  test('Responsive design across different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/payment/test-order-e2e-001');

    await expect(page.getByText('Commande approuvée')).toBeVisible();
    await page.click('button:has-text("Procéder au paiement")');

    // Verify mobile layout
    await expect(page.getByText('Choisissez votre méthode')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Choisissez votre méthode de paiement')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByText('Select your payment method')).toBeVisible();
  });

  test('Form validation and error handling', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');
    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-stripe"]');

    // Try to submit empty form
    await page.click('button:has-text("Payer $45.50")');
    await expect(page.getByText('Veuillez remplir tous les champs requis')).toBeVisible();

    // Test invalid card number
    await page.fill('[data-testid="card-number"]', '1234');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    await page.click('button:has-text("Payer $45.50")');

    await expect(page.getByText('Numéro de carte invalide')).toBeVisible();

    // Test expired date
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry-date"]', '01/20');
    await page.click('button:has-text("Payer $45.50")');

    await expect(page.getByText('Date d\'expiration invalide')).toBeVisible();

    // Test invalid CVV
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '12');
    await page.click('button:has-text("Payer $45.50")');

    await expect(page.getByText('CVV invalide')).toBeVisible();
  });

  test('Multi-language support (French/English)', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');

    // Verify bilingual content
    await expect(page.getByText('Commande approuvée')).toBeVisible();
    await expect(page.getByText('Order Approved')).toBeVisible();

    await page.click('button:has-text("Procéder au paiement")');

    await expect(page.getByText('Choisissez votre méthode de paiement')).toBeVisible();
    await expect(page.getByText('Select your payment method')).toBeVisible();

    await page.click('[data-testid="payment-method-stripe"]');

    // Verify form labels are bilingual
    await expect(page.getByText('Numéro de carte / Card Number')).toBeVisible();
    await expect(page.getByText('Date d\'expiration / Expiry Date')).toBeVisible();
    await expect(page.getByText('Nom du titulaire / Cardholder Name')).toBeVisible();
  });

  test('Session timeout and authentication handling', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');
    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-stripe"]');

    // Simulate session timeout
    await page.route('**/api/orders/*/pay', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Session expired'
        })
      });
    });

    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    await page.click('button:has-text("Payer $45.50")');

    // Verify redirect to login or appropriate error handling
    await expect(page.getByText('Session expired')).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('Network failure handling and retry mechanisms', async ({ page }) => {
    await page.goto('/payment/test-order-e2e-001');
    await page.click('button:has-text("Procéder au paiement")');
    await page.click('[data-testid="payment-method-stripe"]');

    // Simulate network failure
    await page.route('**/api/orders/*/pay', async route => {
      await route.abort('failed');
    });

    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry-date"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'John Doe');
    await page.click('button:has-text("Payer $45.50")');

    // Verify network error handling
    await expect(page.getByText('Erreur de connexion')).toBeVisible();
    await expect(page.getByRole('button', { name: /réessayer/i })).toBeVisible();

    // Restore normal network behavior
    await page.unroute('**/api/orders/*/pay');
    await page.route('**/api/orders/*/pay', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            paymentId: 'payment-retry-001',
            transactionId: 'ch_retry_test123',
            status: 'succeeded'
          }
        })
      });
    });

    // Retry after network recovery
    await page.click('button:has-text("Réessayer")');
    await expect(page.getByText('Paiement réussi')).toBeVisible({ timeout: 10000 });
  });
});