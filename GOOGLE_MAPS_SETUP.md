# Google Maps API Setup

The wedding site onboarding includes address autocomplete and map preview features powered by Google Maps.

## Getting Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a new project or select an existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
4. Go to Credentials and create an API key
5. Copy your API key

## Adding the API Key

Add your API key to the `.env` file:

```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Features Enabled

With the Google Maps API configured, users get:

- **Address Autocomplete**: Start typing an address and get suggestions
- **Interactive Map**: See a map preview with a pin when an address is selected
- **Accurate Coordinates**: Venue location stored for future features (directions, travel planning)

## Important Notes

- The app will still work without the API key, but address autocomplete and maps won't be available
- Consider setting up API restrictions in Google Cloud Console for production
- Monitor your API usage to avoid unexpected charges
