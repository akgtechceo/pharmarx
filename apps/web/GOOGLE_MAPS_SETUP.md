# Google Maps API Setup Guide

This guide will help you set up the Google Maps API key required for the pharmacy map functionality in the PharmaRx application.

## Prerequisites

- A Google Cloud Platform account
- A Google Cloud project
- Billing enabled on your Google Cloud project

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project (required for API usage)

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Maps JavaScript API** - For displaying the interactive map
   - **Places API** - For pharmacy location search and details
   - **Geocoding API** - For address-to-coordinates conversion
   - **Geolocation API** - For getting user's current location

## Step 3: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

## Step 4: Restrict API Key (Recommended)

1. Click on the created API key to edit it
2. Under "Application restrictions", select "HTTP referrers (web sites)"
3. Add your domain(s) to the allowed referrers:
   - For development: `http://localhost:*`
   - For production: `https://yourdomain.com/*`
4. Under "API restrictions", select "Restrict key"
5. Select the APIs you enabled in Step 2
6. Click "Save"

## Step 5: Configure Environment Variables

1. Create a `.env` file in the `apps/web` directory (if it doesn't exist)
2. Add your API key:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

3. Add the `.env` file to your `.gitignore` to keep it secure:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## Step 6: Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the pharmacy map view in your application
3. The map should load without the "Google Maps API Key Required" warning

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GOOGLE_MAPS_API_KEY` | Your Google Maps API key | Yes |
| `VITE_API_BASE_URL` | Backend API base URL | No (defaults to localhost) |
| `VITE_FIREBASE_API_KEY` | Firebase API key for authentication | Yes |

## Troubleshooting

### "Google Maps API Key Required" Error
- Ensure the API key is correctly set in your `.env` file
- Verify the API key is not restricted to specific domains that exclude your development environment
- Check that the Maps JavaScript API is enabled in your Google Cloud project

### Map Not Loading
- Check the browser console for JavaScript errors
- Verify all required APIs are enabled in Google Cloud Console
- Ensure billing is enabled on your Google Cloud project

### CORS Errors
- Add your development domain to the API key restrictions
- For local development, ensure `http://localhost:*` is included

## Cost Considerations

Google Maps API has usage-based pricing. For development and small-scale usage:
- Maps JavaScript API: $7 per 1,000 map loads
- Places API: $17 per 1,000 requests
- Geocoding API: $5 per 1,000 requests

Google provides a $200 monthly credit, which is typically sufficient for development and small applications.

## Security Best Practices

1. **Always restrict your API key** to specific domains and APIs
2. **Never commit API keys** to version control
3. **Use environment variables** for configuration
4. **Monitor API usage** in Google Cloud Console
5. **Set up billing alerts** to avoid unexpected charges

## Production Deployment

For production deployment:
1. Create a separate API key for production
2. Restrict the production key to your production domain only
3. Set up proper environment variables in your deployment platform
4. Monitor usage and costs regularly

## Support

If you encounter issues:
1. Check the [Google Maps JavaScript API documentation](https://developers.google.com/maps/documentation/javascript)
2. Review the [Google Cloud Console](https://console.cloud.google.com/) for API usage and errors
3. Check the browser console for detailed error messages