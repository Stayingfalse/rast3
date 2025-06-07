# Simplified OAuth2 Email Setup Guide

## Overview

The OAuth2 email setup has been simplified to use your existing NextAuth.js Google provider configuration. This eliminates the need for manual token generation through Google's OAuth2 Playground.

## ✅ What Was Implemented

### 1. Simplified Authentication Flow

- **Uses existing NextAuth.js Google provider**: Leverages your current `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from `.env`
- **Automatic token retrieval**: Gets OAuth2 tokens directly from your authenticated Google session
- **No manual setup required**: No need to configure separate OAuth2 credentials or use OAuth2 Playground

### 2. Updated Admin Interface

- **Streamlined UI**: Removed manual client ID/secret input fields for OAuth2
- **One-click authentication**: Simple "Get OAuth2 Tokens from Google" button
- **Environment validation**: Checks if Google OAuth2 is properly configured
- **Clear error messaging**: Helpful guidance if configuration is missing

### 3. Server-Side Integration

- **Automatic credential injection**: Server automatically adds Google credentials to OAuth2 email configurations
- **Secure token handling**: Uses NextAuth.js account tokens for email authentication
- **Enhanced Google provider**: Configured with Gmail scope for email sending

## 🚀 How to Use

### Prerequisites

1. Ensure your `.env` file has Google OAuth2 configured:

   ```env
   AUTH_GOOGLE_ID=your-google-client-id.googleusercontent.com
   AUTH_GOOGLE_SECRET=your-google-client-secret
   ```

2. Make sure you're signed in to the application with your Google account

### Setting Up OAuth2 Email Provider

1. **Navigate to Admin Settings**

   - Go to `/admin/settings`
   - Click "Configure" on the "Email (Magic Links)" provider

2. **Configure Basic Settings**

   - Set SMTP Host: `smtp.gmail.com`
   - Set Port: `587`
   - Set From Email: Your Gmail address
   - Set Email Username: Your Gmail address

3. **Choose OAuth2 Authentication**

   - Select "OAuth2 (Gmail)" radio button
   - You'll see a helpful info box explaining the NextAuth.js integration

4. **Get OAuth2 Tokens**

   - Click "Get OAuth2 Tokens from Google" button
   - The system will automatically retrieve tokens from your Google session
   - Refresh and access tokens will be populated automatically

5. **Save Configuration**
   - Click "Save" to store the email provider configuration
   - The server will automatically add your Google OAuth2 credentials

## 🔧 Technical Details

### Server-Side Processing

The server automatically enhances OAuth2 email configurations:

```typescript
// Automatically adds Google credentials for OAuth2 email providers
if (emailConfig.authType === "oauth2") {
  emailConfig.clientId = process.env.AUTH_GOOGLE_ID;
  emailConfig.clientSecret = process.env.AUTH_GOOGLE_SECRET;
}
```

### Token Retrieval

Tokens are retrieved from the NextAuth.js accounts table:

```typescript
// Gets tokens from user's Google account
const googleAccount = await db.account.findFirst({
  where: {
    userId: session.user.id,
    provider: "google",
  },
});
```

### Gmail Scope Configuration

The Google provider is configured with Gmail scope in `auth-dynamic.ts`:

```typescript
GoogleProvider({
  // ... other config
  authorization: {
    params: {
      scope: "openid email profile https://mail.google.com/",
      access_type: "offline",
      prompt: "consent",
    },
  },
});
```

## ✅ Benefits of Simplified Approach

1. **No Manual Token Generation**: Eliminates the need for OAuth2 Playground
2. **Leverages Existing Auth**: Uses your current NextAuth.js Google setup
3. **Reduced Configuration**: Fewer fields to configure in the admin UI
4. **Better Security**: Tokens are managed by NextAuth.js
5. **Automatic Updates**: Refresh tokens are handled automatically
6. **Clear Error Handling**: Better feedback when authentication fails

## 🐛 Troubleshooting

### "Google OAuth2 is not configured"

- Check that `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in your `.env`
- Restart the development server after adding environment variables

### "No Google account found"

- Make sure you're signed in with Google through NextAuth.js
- Sign out and sign back in to refresh your Google session

### "Google account does not have required OAuth2 tokens"

- Your Google account might not have the Gmail scope
- Sign out and sign back in to re-authenticate with updated scopes

### Email Sending Issues

- Verify your Gmail address is correct in the configuration
- Check that your Google account has Gmail API access enabled
- Ensure your tokens haven't expired (NextAuth.js should handle refresh automatically)

## 📝 Next Steps

1. **Test Email Sending**: Try sending a test email using the configured provider
2. **Monitor Token Refresh**: Watch for automatic token renewal in logs
3. **Production Deployment**: Ensure environment variables are properly set in production

This simplified approach makes OAuth2 email setup much more user-friendly while maintaining the same security and functionality as the original implementation.
