# OAuth2 Email Configuration Guide

This guide explains how to set up OAuth2 authentication for email providers, specifically focusing on Google Gmail SMTP configuration for the Secret Santa application.

## Overview

The application now supports two types of email authentication:

1. **Basic Authentication**: Traditional username/password (or App Password for Gmail)
2. **OAuth2 Authentication**: Modern OAuth2 flow for services like Gmail that require it

## Google OAuth2 Setup for Gmail SMTP

### Prerequisites

- Google Cloud Console account
- Gmail account for sending emails
- Admin access to the Secret Santa application

### Step 1: Create Google Cloud Project and OAuth2 Credentials

1. **Go to Google Cloud Console**

   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Gmail API**

   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Create OAuth2 Credentials**

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure OAuth consent screen if prompted
   - Application type: "Web application"
   - Name: "Secret Santa Email Service"
   - Authorized redirect URIs: Add `https://developers.google.com/oauthplayground`

4. **Note your credentials**
   - Copy the **Client ID** and **Client Secret**

### Step 2: Generate Refresh Token

1. **Go to OAuth2 Playground**

   - Visit [Google OAuth2 Playground](https://developers.google.com/oauthplayground)

2. **Configure OAuth2 Playground**

   - Click the gear icon (⚙️) in the top right
   - Check "Use your own OAuth credentials"
   - Enter your **Client ID** and **Client Secret**
   - Close the configuration panel

3. **Authorize Gmail API**

   - In the left panel, scroll down to "Gmail API v1"
   - Select `https://mail.google.com/` scope
   - Click "Authorize APIs"
   - Sign in with your Gmail account
   - Grant permissions

4. **Exchange authorization code**
   - After authorization, you'll be redirected back
   - Click "Exchange authorization code for tokens"
   - Copy the **Refresh Token** (you'll need this)
   - Optionally copy the **Access Token** (will auto-regenerate if empty)

### Step 3: Configure in Secret Santa Application

1. **Access Admin Settings**

   - Navigate to `/admin/settings` in your application
   - You must be logged in as an admin user

2. **Add New Email Provider**

   - Click "Add New Provider" button
   - Fill in the following details:

   **Basic Information:**

   - Name: `gmail-oauth2` (or any unique identifier)
   - Display Name: `Gmail OAuth2`
   - Check "Email Provider"
   - Check "Enable this provider"

   **Email Configuration:**

   - Authentication Type: Select "OAuth2"
   - SMTP Host: `smtp.gmail.com`
   - Port: `587`
   - From Email: Your Gmail address (e.g., `noreply@yourdomain.com`)
   - Email Username: Your Gmail address
   - OAuth2 Client ID: [From Step 1]
   - OAuth2 Client Secret: [From Step 1]
   - OAuth2 Refresh Token: [From Step 2]
   - OAuth2 Access Token: [From Step 2] (optional - leave empty to auto-generate)

3. **Save Configuration**
   - Click "Save" to store the configuration
   - Test the configuration by sending a test email

## Configuration Examples

### Basic Authentication (App Password)

```json
{
  "authType": "basic",
  "host": "smtp.gmail.com",
  "port": 587,
  "from": "noreply@yourdomain.com",
  "user": "your-email@gmail.com",
  "password": "your-16-char-app-password"
}
```

### OAuth2 Authentication

```json
{
  "authType": "oauth2",
  "host": "smtp.gmail.com",
  "port": 587,
  "from": "noreply@yourdomain.com",
  "user": "your-email@gmail.com",
  "clientId": "your-client-id.googleusercontent.com",
  "clientSecret": "your-client-secret",
  "refreshToken": "your-refresh-token",
  "accessToken": "your-access-token"
}
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**

   - Verify Client ID and Client Secret are correct
   - Ensure Gmail API is enabled in Google Cloud Console
   - Check that the OAuth consent screen is properly configured

2. **"Refresh token expired" error**

   - Regenerate the refresh token using OAuth2 Playground
   - Make sure to select the correct scope (`https://mail.google.com/`)

3. **"SMTP connection failed" error**

   - Verify SMTP host is `smtp.gmail.com` and port is `587`
   - Check firewall settings
   - Ensure the Gmail account is not blocked

4. **"Access token invalid" error**
   - Leave the Access Token field empty - it will auto-generate
   - Or regenerate both refresh and access tokens

### Testing Email Configuration

You can test your email configuration using the built-in test script:

```bash
node test-oauth2-email.js
```

This script validates the configuration structure and ensures proper authentication setup.

## Security Best Practices

1. **Store credentials securely**

   - Keep Client Secret confidential
   - Rotate tokens periodically
   - Use environment variables for production

2. **Limit OAuth2 scope**

   - Only request necessary permissions
   - Use `https://mail.google.com/` for sending emails

3. **Monitor usage**

   - Set up quota alerts in Google Cloud Console
   - Monitor failed authentication attempts

4. **Regular maintenance**
   - Review and rotate OAuth2 credentials periodically
   - Update refresh tokens before expiration

## Advanced Configuration

### Multiple Email Providers

You can configure multiple email providers with different authentication methods:

- Primary: OAuth2 for Gmail
- Backup: Basic authentication for alternative SMTP service

### Custom Domains

For custom domain emails through Gmail:

1. Set up domain verification in Google Cloud Console
2. Configure DNS records for your domain
3. Use your custom domain email in the configuration

### Production Deployment

For Docker/production environments:

- Store sensitive values in environment variables
- Use proper secrets management
- Set up monitoring and alerting

## Support

If you encounter issues:

1. Check the application logs for detailed error messages
2. Verify all configuration values are correct
3. Test with the provided test script
4. Consult Google's OAuth2 documentation for advanced troubleshooting
