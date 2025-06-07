<!-- OAuth2 Email Setup Troubleshooting Guide -->

# OAuth2 Email Setup Troubleshooting

## Current Issue: "Error 401: invalid_client"

This error occurs when Google rejects the OAuth2 client credentials. Here's how to fix it:

## Step 1: Verify Google Cloud Console Setup

### 1.1 Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the project name/ID

### 1.2 Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Gmail API** (required for sending emails)
   - **Google OAuth2 API** (usually enabled by default)

### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace)
3. Fill in required fields:
   - App name: "Your App Name"
   - User support email: your email
   - Developer contact email: your email
4. Add scopes:
   - `https://mail.google.com/` (for Gmail sending)
5. Save and continue

### 1.4 Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Set name: "Email Provider OAuth2"
5. **CRITICAL**: Add Authorized redirect URIs:
   ```
   http://localhost:3000/oauth2/callback
   https://yourdomain.com/oauth2/callback
   ```
6. Click "Create"
7. **SAVE** the Client ID and Client Secret

## Step 2: Verify Credential Format

### Valid Google Client ID Format:

```
123456789012-abcdefghijklmnopqrstuvwxyz123456.googleusercontent.com
```

- Must start with numbers
- Has a hyphen
- Ends with `.googleusercontent.com`

### Valid Google Client Secret Format:

```
GOCSPX-abcdefghijklmnopqrstuvwxyz123456
```

- Usually starts with `GOCSPX-`
- 24+ characters long
- Contains letters, numbers, hyphens, underscores

## Step 3: Common Issues and Solutions

### Issue: "redirect_uri_mismatch"

**Solution**: The redirect URI in your Google Cloud Console must EXACTLY match:

- Development: `http://localhost:3000/oauth2/callback`
- Production: `https://yourdomain.com/oauth2/callback`

### Issue: "invalid_client"

**Possible Causes**:

1. **Wrong Client ID**: Copy-paste error or using placeholder values
2. **Wrong Client Secret**: Copy-paste error or using old secret
3. **API not enabled**: Gmail API not enabled in Google Cloud Console
4. **OAuth consent screen not configured**: Required fields missing

### Issue: "access_denied"

**Solution**: User denied access or OAuth consent screen not properly configured

## Step 4: Testing Your Credentials

Use this validation checklist:

```javascript
// Test your credentials (replace with your actual values)
const clientId = "YOUR_CLIENT_ID";
const clientSecret = "YOUR_CLIENT_SECRET";

// Validation
const isValidClientId = /^[0-9]+-[a-zA-Z0-9]+\.googleusercontent\.com$/.test(
  clientId,
);
const isValidClientSecret = /^[a-zA-Z0-9_-]{24,}$/.test(clientSecret);

console.log("Client ID valid:", isValidClientId);
console.log("Client Secret valid:", isValidClientSecret);
```

## Step 5: Debug Process

1. **Try the OAuth2 flow** with proper credentials
2. **Check browser console** for any JavaScript errors
3. **Check server logs** for detailed error messages
4. **Verify redirect URI** matches exactly in Google Cloud Console

## Step 6: Test URLs

### Google OAuth2 Authorization URL Format:

```
https://accounts.google.com/o/oauth2/v2/auth?
client_id=YOUR_CLIENT_ID&
redirect_uri=http://localhost:3000/oauth2/callback&
response_type=code&
scope=https://mail.google.com/&
access_type=offline&
prompt=consent
```

### Google Token Exchange URL:

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=http://localhost:3000/oauth2/callback&
grant_type=authorization_code
```

## Step 7: Security Notes

- **Never commit credentials** to version control
- **Use environment variables** for production
- **Regularly rotate** client secrets
- **Monitor usage** in Google Cloud Console

## Next Steps

1. Double-check your Google Cloud Console setup
2. Verify credential formats
3. Test with the debug logging enabled
4. Check the browser network tab for actual error responses
5. Contact support if issues persist

---

_This guide should resolve most OAuth2 setup issues. The key is ensuring exact matches between your redirect URIs and proper credential formats._
