import { environment } from '../config/environment';

export interface GoogleMapsValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export const validateGoogleMapsSetup = (): GoogleMapsValidationResult => {
  const result: GoogleMapsValidationResult = {
    isValid: true,
    warnings: []
  };

  // Check if API key is configured
  if (!environment.googleMapsApiKey) {
    result.isValid = false;
    result.error = 'Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.';
    return result;
  }

  // Check if API key looks valid (basic format check)
  if (environment.googleMapsApiKey.length < 20) {
    result.warnings?.push('API key seems too short. Please verify your Google Maps API key.');
  }

  // Check if API key contains common placeholder text
  if (environment.googleMapsApiKey.includes('your_') || environment.googleMapsApiKey.includes('placeholder')) {
    result.isValid = false;
    result.error = 'Please replace the placeholder API key with your actual Google Maps API key.';
    return result;
  }

  return result;
};

export const testGoogleMapsConnection = async (): Promise<boolean> => {
  try {
    // Test if Google Maps API is accessible
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`
    );
    
    if (!response.ok) {
      console.error('Google Maps API test failed:', response.status, response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Google Maps API connection test failed:', error);
    return false;
  }
};

export const logGoogleMapsStatus = (): void => {
  const validation = validateGoogleMapsSetup();
  
  if (!validation.isValid) {
    console.error('❌ Google Maps Setup Error:', validation.error);
    console.log('📖 Please follow the setup guide in GOOGLE_MAPS_SETUP.md');
    return;
  }

  if (validation.warnings && validation.warnings.length > 0) {
    console.warn('⚠️ Google Maps Setup Warnings:', validation.warnings);
  }

  console.log('✅ Google Maps API key is configured');
  console.log('🔑 API Key:', environment.googleMapsApiKey.substring(0, 10) + '...');
}; 