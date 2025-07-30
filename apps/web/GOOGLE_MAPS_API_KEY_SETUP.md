# Fix Google Maps API Key Referer Error

## Error Message
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: http://localhost:5173/map-demo
```

## Problem
Your Google Maps API key is not authorized for the localhost domain where you're testing the application.

## Solution

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Credentials"

### Step 2: Edit Your API Key
1. Click on your API key to edit it
2. Under "Application restrictions", select "HTTP referrers (web sites)"
3. Add these URLs to the allowed referrers:

```
http://localhost:*
http://localhost:5173/*
http://127.0.0.1:*
http://127.0.0.1:5173/*
```

### Step 3: Save Changes
1. Click "Save" to apply the changes
2. Wait a few minutes for the changes to propagate

### Step 4: Test
1. Refresh your browser
2. Navigate to the map page
3. Check the console for any remaining errors

## Alternative: Use Unrestricted Key (Development Only)

⚠️ **WARNING: Only use this for development/testing**

If you want to quickly test without setting up referrer restrictions:

1. In Google Cloud Console, go to your API key settings
2. Under "Application restrictions", select "None"
3. **Remember to restrict it later for production**

## Production Setup

For production deployment, make sure to:

1. Create a separate API key for production
2. Restrict the production key to your actual domain only
3. Never use unrestricted keys in production

## Troubleshooting

- **Changes not taking effect**: Wait 5-10 minutes for propagation
- **Still getting errors**: Clear browser cache and try again
- **Multiple domains**: Add all your development and production domains

## Security Best Practices

1. **Always restrict API keys** to specific domains
2. **Use different keys** for development and production
3. **Monitor API usage** in Google Cloud Console
4. **Set up billing alerts** to avoid unexpected charges 