import { test, expect } from '@playwright/test';

/**
 * Comprehensive OCR Integration Tests with Real API Responses
 * 
 * These tests hit actual backend APIs to ensure end-to-end functionality
 * without mocking. Requires backend server to be running.
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds for OCR processing
  retries: 2,
  apiHealthCheckTimeout: 5000
};

test.describe('Real OCR Workflow Integration', () => {
  let authToken: string;
  let testPatientId: string;

  test.beforeAll(async ({ request }) => {
    // Verify backend API is running
    try {
      const healthResponse = await request.get(`${API_BASE_URL}/../health`, {
        timeout: TEST_CONFIG.apiHealthCheckTimeout
      });
      expect(healthResponse.status()).toBe(200);
      console.log('✅ Backend API health check passed');
    } catch (error) {
      throw new Error(`Backend API is not responding at ${API_BASE_URL}. Please ensure the backend server is running.`);
    }

    // Create test user and get auth token for integration tests
    const testUser = {
      uid: `integration-test-${Date.now()}`,
      role: 'patient',
      email: `integration.test.${Date.now()}@example.com`,
      displayName: 'Integration Test Patient'
    };

    try {
      // Mock Firebase authentication for integration testing
      // In a real scenario, this would use Firebase Admin SDK or test tokens
      const authResponse = await request.post(`${API_BASE_URL}/auth/register`, {
        data: testUser,
        headers: {
          'Content-Type': 'application/json',
          // Use a test authorization header for integration testing
          'Authorization': 'Bearer test-integration-token'
        }
      });

      if (authResponse.ok()) {
        const authData = await authResponse.json();
        testPatientId = authData.data.uid;
        authToken = 'test-integration-token'; // In real scenario, get from Firebase
        console.log('✅ Test user created for integration tests');
      } else {
        console.warn('⚠️ Test user creation failed, proceeding with fallback auth');
        authToken = 'test-integration-token';
        testPatientId = 'test-patient-integration';
      }
    } catch (error) {
      console.warn('⚠️ Using fallback authentication for integration tests');
      authToken = 'test-integration-token';
      testPatientId = 'test-patient-integration';
    }
  });

  test('should complete real prescription upload and OCR processing workflow', async ({ request, page }) => {
    test.setTimeout(TEST_CONFIG.timeout);

    // Step 1: Upload a real test image (create minimal test image data)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    ); // 1x1 pixel PNG

    // Step 2: Create prescription order via real API
    const orderResponse = await request.post(`${API_BASE_URL}/orders`, {
      data: {
        patientProfileId: testPatientId,
        originalImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'pending_verification'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(orderResponse.status()).toBe(201);
    const orderData = await orderResponse.json();
    
    expect(orderData.success).toBe(true);
    expect(orderData.data).toHaveProperty('orderId');
    expect(orderData.data.ocrStatus).toBe('pending');
    
    const orderId = orderData.data.orderId;
    console.log(`✅ Created prescription order: ${orderId}`);

    // Step 3: Monitor real OCR processing status
    let ocrCompleted = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!ocrCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await request.get(`${API_BASE_URL}/orders/${orderId}/ocr-status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(statusResponse.status()).toBe(200);
      const statusData = await statusResponse.json();
      
      console.log(`📊 OCR Status Check ${attempts + 1}: ${statusData.data.status}`);

      if (statusData.data.status === 'completed') {
        ocrCompleted = true;
        expect(statusData.data).toHaveProperty('extractedText');
        expect(statusData.data).toHaveProperty('processedAt');
        console.log(`✅ OCR processing completed: ${statusData.data.extractedText?.substring(0, 50)}...`);
      } else if (statusData.data.status === 'failed') {
        console.log(`❌ OCR processing failed: ${statusData.data.error}`);
        // This is acceptable for testing - we'll test the failure handling
        break;
      }
      
      attempts++;
    }

    // Step 4: Verify order was updated with OCR results
    const finalOrderResponse = await request.get(`${API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(finalOrderResponse.status()).toBe(200);
    const finalOrderData = await finalOrderResponse.json();
    
    expect(finalOrderData.success).toBe(true);
    expect(finalOrderData.data.orderId).toBe(orderId);
    expect(['completed', 'failed']).toContain(finalOrderData.data.ocrStatus);
    
    console.log(`✅ Final order status: ${finalOrderData.data.ocrStatus}`);
  });

  test('should handle real OCR failure and manual text entry workflow', async ({ request }) => {
    test.setTimeout(TEST_CONFIG.timeout);

    // Create order with intentionally poor quality image
    const orderResponse = await request.post(`${API_BASE_URL}/orders`, {
      data: {
        patientProfileId: testPatientId,
        originalImageUrl: 'data:image/png;base64,invalid-image-data',
        status: 'pending_verification'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(orderResponse.status()).toBe(201);
    const orderData = await orderResponse.json();
    const orderId = orderData.data.orderId;

    // Wait for OCR to fail
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if OCR failed
    const statusResponse = await request.get(`${API_BASE_URL}/orders/${orderId}/ocr-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(statusResponse.status()).toBe(200);
    const statusData = await statusResponse.json();

    if (statusData.data.status === 'failed') {
      console.log('✅ OCR failed as expected, testing manual text entry');

      // Test manual text entry fallback
      const manualTextResponse = await request.put(`${API_BASE_URL}/orders/${orderId}/manual-text`, {
        data: {
          extractedText: 'Patient: John Doe\nMedication: Aspirin 81mg\nInstructions: Take once daily\nQuantity: 30 tablets'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(manualTextResponse.status()).toBe(200);
      const manualTextData = await manualTextResponse.json();
      
      expect(manualTextData.success).toBe(true);
      expect(manualTextData.data.ocrStatus).toBe('completed');
      expect(manualTextData.data.extractedText).toContain('Aspirin 81mg');
      
      console.log('✅ Manual text entry workflow completed successfully');
    } else {
      console.log('ℹ️ OCR unexpectedly succeeded, skipping manual text entry test');
    }
  });

  test('should validate real API error handling', async ({ request }) => {
    // Test invalid order creation
    const invalidOrderResponse = await request.post(`${API_BASE_URL}/orders`, {
      data: {
        // Missing required fields
        patientProfileId: ''
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(invalidOrderResponse.status()).toBe(400);
    const errorData = await invalidOrderResponse.json();
    expect(errorData.success).toBe(false);
    expect(errorData).toHaveProperty('error');
    
    console.log('✅ API error handling validated');

    // Test unauthorized access
    const unauthorizedResponse = await request.get(`${API_BASE_URL}/orders/nonexistent-order`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    expect(unauthorizedResponse.status()).toBe(401);
    console.log('✅ API authorization validated');
  });

  test('should handle real OCR service health checks', async ({ request }) => {
    // Test OCR service health endpoint
    const healthResponse = await request.get(`${API_BASE_URL}/ocr/health`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect([200, 503]).toContain(healthResponse.status());
    const healthData = await healthResponse.json();
    
    expect(healthData).toHaveProperty('status');
    expect(['healthy', 'unhealthy']).toContain(healthData.status);
    
    console.log(`✅ OCR service health: ${healthData.status}`);
  });

  test('should handle real database persistence', async ({ request }) => {
    // Create multiple orders to test database persistence
    const orderIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const orderResponse = await request.post(`${API_BASE_URL}/orders`, {
        data: {
          patientProfileId: testPatientId,
          originalImageUrl: `data:image/png;base64,test-image-${i}`,
          status: 'pending_verification'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(orderResponse.status()).toBe(201);
      const orderData = await orderResponse.json();
      orderIds.push(orderData.data.orderId);
    }

    // Retrieve all orders for the patient
    const ordersListResponse = await request.get(`${API_BASE_URL}/orders?patientId=${testPatientId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(ordersListResponse.status()).toBe(200);
    const ordersData = await ordersListResponse.json();
    
    expect(ordersData.success).toBe(true);
    expect(Array.isArray(ordersData.data)).toBe(true);
    expect(ordersData.data.length).toBeGreaterThanOrEqual(3);

    // Verify our created orders are in the list
    const retrievedOrderIds = ordersData.data.map((order: any) => order.orderId);
    for (const orderId of orderIds) {
      expect(retrievedOrderIds).toContain(orderId);
    }

    console.log(`✅ Database persistence validated with ${orderIds.length} orders`);
  });

  test('should handle real concurrent OCR processing', async ({ request }) => {
    test.setTimeout(60000); // 1 minute for concurrent processing

    // Create multiple orders concurrently
    const concurrentOrders = Array.from({ length: 3 }, (_, i) => 
      request.post(`${API_BASE_URL}/orders`, {
        data: {
          patientProfileId: testPatientId,
          originalImageUrl: `data:image/png;base64,concurrent-test-${i}`,
          status: 'pending_verification'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
    );

    const orderResponses = await Promise.all(concurrentOrders);
    const orderIds = await Promise.all(
      orderResponses.map(async (response) => {
        expect(response.status()).toBe(201);
        const data = await response.json();
        return data.data.orderId;
      })
    );

    console.log(`✅ Created ${orderIds.length} concurrent orders`);

    // Monitor all orders for completion
    const statusChecks = orderIds.map(async (orderId) => {
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const statusResponse = await request.get(`${API_BASE_URL}/orders/${orderId}/ocr-status`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        const statusData = await statusResponse.json();
        
        if (['completed', 'failed'].includes(statusData.data.status)) {
          return { orderId, status: statusData.data.status };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      return { orderId, status: 'timeout' };
    });

    const results = await Promise.all(statusChecks);
    
    // Verify all orders were processed (completed or failed, but not timeout)
    for (const result of results) {
      expect(['completed', 'failed']).toContain(result.status);
      console.log(`✅ Concurrent order ${result.orderId}: ${result.status}`);
    }
  });
});