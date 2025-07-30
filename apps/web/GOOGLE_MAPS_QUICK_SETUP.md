# Google Maps API Quick Setup Guide

This guide will help you quickly set up Google Maps API to replace mock data in your PharmaRx application.

## 🚀 Quick Start (5 minutes)

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing (required)
4. Go to "APIs & Services" > "Library"
5. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
   - **Geolocation API**
6. Go to "APIs & Services" > "Credentials"
7. Click "Create Credentials" > "API Key"
8. Copy the API key

### Step 2: Create Environment File

```bash
# Navigate to web app directory
cd apps/web

# Copy the example file
copy env.example .env

# Edit the .env file and replace with your actual API key
```

Edit `apps/web/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
# ... other Firebase config
```

### Step 3: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser console and run:
   ```javascript
   window.testGoogleMaps()
   ```

3. You should see:
   ```
   ✅ API Key is configured
   ✅ Google Maps API loaded successfully
   ✅ Google Maps objects are available
   ```

## 🔧 Troubleshooting

### "API Key is not set" Error
- Make sure you created the `.env` file in `apps/web/`
- Verify the variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`
- Restart the development server after creating `.env`

### "Failed to load Google Maps API" Error
- Check if your API key is correct
- Verify all required APIs are enabled in Google Cloud Console
- Ensure billing is enabled on your Google Cloud project

### Map Still Shows Mock Data
- Check browser console for errors
- Verify the API key is being loaded correctly
- Make sure you're not in test mode (the app uses real Google Maps when API key is present)

## 📋 What's Already Configured

✅ Google Maps dependencies installed:
- `@googlemaps/js-api-loader`
- `@googlemaps/react-wrapper`
- `@types/google.maps`

✅ Map service implementation ready
✅ Pharmacy map components ready
✅ Environment configuration ready

## 🎯 Next Steps

1. **Secure your API key** (recommended):
   - Go to Google Cloud Console > Credentials
   - Click on your API key
   - Add HTTP referrer restrictions
   - Add API restrictions

2. **Test the map functionality**:
   - Navigate to `/portal/patient`
   - Try the pharmacy selection workflow
   - Verify real map loads instead of mock data

## 💰 Cost Information

- Google provides $200 monthly credit
- Maps JavaScript API: $7 per 1,000 map loads
- Places API: $17 per 1,000 requests
- Geocoding API: $5 per 1,000 requests

For development, the free tier should be sufficient.

## 🆘 Need Help?

1. Check the detailed setup guide: `GOOGLE_MAPS_SETUP.md`
2. Run the test function: `window.testGoogleMaps()`
3. Check browser console for detailed error messages
4. Verify your Google Cloud Console settings 