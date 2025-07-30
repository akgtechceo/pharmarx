// Test script for Google Maps API setup
// Run this in the browser console to verify your setup

export const testGoogleMapsSetup = async () => {
  console.log('🧪 Testing Google Maps API Setup...');
  
  // Check if environment variables are loaded
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ VITE_GOOGLE_MAPS_API_KEY is not set');
    console.log('📝 Please create a .env file in apps/web/ with your API key');
    return false;
  }
  
  if (apiKey.includes('your_') || apiKey.includes('placeholder')) {
    console.error('❌ Please replace the placeholder API key with your actual key');
    return false;
  }
  
  console.log('✅ API Key is configured');
  
  // Test if Google Maps API is already loaded
  if (window.google && window.google.maps) {
    console.log('✅ Google Maps API is already loaded');
    console.log('🗺️ Available APIs:', Object.keys(window.google.maps));
    return true;
  } else {
    console.log('ℹ️ Google Maps API not loaded yet. This is normal if no map component has rendered.');
    console.log('💡 Navigate to a page with a map to load the API automatically.');
    return false;
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testGoogleMaps = testGoogleMapsSetup;
  console.log('🔧 Google Maps test function available: window.testGoogleMaps()');
} 