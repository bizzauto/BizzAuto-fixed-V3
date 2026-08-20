# Social Media Connection Guide

## How to Connect Your Social Media Accounts

### Facebook & Instagram

1. **Get Meta Developer Credentials:**
   - Go to https://developers.facebook.com/
   - Create a new app
   - Add "Facebook Login" product
   - Note your App ID and App Secret

2. **Add to `.env`:**
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   BASE_URL=http://localhost:4000
   ```

3. **Connect in BizzAuto:**
   - Go to Social Media > Connected Accounts
   - Click "Connect Facebook"
   - Authorize the app
   - Select pages to connect

### Google Business Profile

1. **Get Google Cloud Credentials:**
   - Go to https://console.cloud.google.com/
   - Create new project
   - Enable "Google My Business API"
   - Create OAuth 2.0 credentials
   - Note Client ID and Client Secret

2. **Add to `.env`:**
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   BASE_URL=http://localhost:4000
   ```

3. **Connect in BizzAuto:**
   - Go to Reviews > Settings
   - Click "Connect Google Business"
   - Authorize with Google
   - Select your business location

### Twitter/X

1. **Get Twitter Developer Credentials:**
   - Go to https://developer.twitter.com/
   - Create developer account
   - Create new app
   - Get API Key and Secret

2. **Add to `.env`:**
   ```env
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_BEARER_TOKEN=your_bearer_token
   ```

---

## Troubleshooting

### OAuth Not Working
- Check redirect URIs match exactly
- Verify app is in development/live mode
- Check browser console for errors

### Token Expired
- Re-authorize the account
- Tokens auto-refresh for most platforms

### Can't Post
- Check page permissions granted
- Verify token hasn't expired
- Check platform API status
