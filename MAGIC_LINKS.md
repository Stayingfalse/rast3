# Magic Links Email Authentication

This document explains how to set up and use magic links email authentication in the RAoSanta application.

## Overview

Magic links allow users to sign in by clicking a link sent to their email address, eliminating the need for passwords. This feature is implemented using NextAuth.js's Nodemailer provider.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file to enable email authentication:

```bash
# Email Provider (for magic links)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="your-email@gmail.com"
```

### SMTP Provider Examples

#### Gmail
```bash
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"  # Use App Password, not regular password
EMAIL_FROM="your-email@gmail.com"
```

#### Outlook/Hotmail
```bash
EMAIL_SERVER_HOST="smtp-mail.outlook.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@outlook.com"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="your-email@outlook.com"
```

#### SendGrid
```bash
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="your-sendgrid-api-key"
EMAIL_FROM="your-verified-sender@yourdomain.com"
```

#### Custom SMTP
```bash
EMAIL_SERVER_HOST="your-smtp-server.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-username"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="noreply@yourdomain.com"
```

## Features

### User Experience

1. **Email Button**: When email provider is configured, users see a "Continue with Email" button in the sign-in modal
2. **Email Form**: Clicking the email button reveals an email input form
3. **Magic Link**: After entering their email, users receive a magic link via email
4. **One-Click Sign-in**: Clicking the magic link automatically signs them in

### UI Components

- **Dynamic Provider Detection**: Email provider only appears when properly configured
- **Responsive Design**: Email form adapts to different screen sizes
- **Loading States**: Shows loading spinner while sending magic link
- **Error Handling**: Proper error handling for failed email sends
- **Cancellation**: Users can cancel email form and return to provider list

### Security Features

- **Email Verification**: Only users with access to the email address can sign in
- **Temporary Links**: Magic links expire after a set time period
- **Account Linking**: Supports linking email accounts with existing OAuth accounts

## Database Schema

The email authentication works with the existing Prisma schema. NextAuth.js automatically handles:

- User creation when someone signs in with a new email
- Account linking when users sign in with the same email via different providers
- Session management for email-authenticated users

## Development Testing

For testing during development, you can use:

1. **Ethereal Email**: Free testing SMTP service
2. **MailHog**: Local email testing server
3. **Gmail App Passwords**: For quick setup with personal Gmail account

### Using Ethereal Email for Testing

```bash
# Get credentials from https://ethereal.email/create
EMAIL_SERVER_HOST="smtp.ethereal.email"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="ethereal-username"
EMAIL_SERVER_PASSWORD="ethereal-password"
EMAIL_FROM="test@ethereal.email"
```

## Troubleshooting

### Common Issues

1. **No Email Button**: Check that all required environment variables are set
2. **SMTP Connection Failed**: Verify SMTP credentials and server settings
3. **Magic Link Not Working**: Check email spam folder and link expiration
4. **Authentication Errors**: Ensure database schema is up to date

### Debug Mode

Enable NextAuth.js debugging by setting:

```bash
NODE_ENV="development"
```

This will show detailed authentication logs in the console.

## Production Considerations

1. **Reliable SMTP**: Use a professional email service (SendGrid, AWS SES, etc.)
2. **Email Deliverability**: Configure SPF, DKIM, and DMARC records
3. **Rate Limiting**: Implement rate limiting for magic link requests
4. **Domain Verification**: Use a verified sending domain
5. **Monitoring**: Monitor email delivery rates and authentication success

## Integration with Other Providers

Magic links work seamlessly alongside OAuth providers:

- Users can choose between OAuth and email authentication
- Accounts are automatically linked when using the same email address
- Consistent user experience across all authentication methods
- Same session management and user permissions apply

## Customization

The email authentication can be customized by modifying:

- `src/server/auth.ts` - Server-side email provider configuration
- `src/app/_components/sign-in-modal.tsx` - UI components and styling
- Email templates (if using custom SMTP solutions)
