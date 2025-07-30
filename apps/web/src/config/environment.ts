// Environment configuration for the web application
export const environment = {
  // Google Maps API Configuration
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/pharmarx-dev/us-central1/api',
  
  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  },
  
  // Feature flags
  features: {
    enableMapView: true,
    enablePharmacySelection: true,
    enableRealTimeInventory: true
  }
};

// Validation function to check if required environment variables are set
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];
  
  if (!environment.googleMapsApiKey) {
    errors.push('VITE_GOOGLE_MAPS_API_KEY is required for map functionality');
  }
  
  if (!environment.firebase.apiKey) {
    errors.push('VITE_FIREBASE_API_KEY is required for authentication');
  }
  
  return errors;
};

// Helper function to get Google Maps API key with validation
export const getGoogleMapsApiKey = (): string => {
  if (!environment.googleMapsApiKey) {
    console.warn('Google Maps API key is not configured. Map functionality will be limited.');
  }
  return environment.googleMapsApiKey;
};