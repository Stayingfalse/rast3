# Custom Christmas-Themed Magic Link Email Templates

## Overview

The RAoSanta application now features custom Christmas and Secret Santa-themed email templates for magic link authentication. These templates match the site's festive branding with red and green colors, Christmas emojis, and holiday messaging.

## Features

### 🎄 Christmas Theming
- **Colors**: Red and green gradient backgrounds matching the site's theme
- **Emojis**: Santa (🎅), Christmas tree (🎄), gifts (🎁), bells (🔔), snowflakes (❄️)
- **Messaging**: Holiday-themed copy with "Ho ho ho!" greetings and Santa references
- **Design**: Modern, responsive email template with beautiful styling

### 📧 Email Template Components
- **Header**: Red-to-green gradient with Santa emoji and "Magic Link Ready!" title
- **Content**: Holiday greeting, clear call-to-action button, security information
- **Button**: Large, prominent "🎅 Sign In Now" button with hover effects
- **Security Note**: Clear explanation of link expiration and safety
- **Footer**: Holiday wishes from the team and contact information
- **Responsive**: Mobile-friendly design that works on all devices

### 🔒 Security Features
- Clear indication that links expire in 24 hours
- One-time use only messaging
- Plain text fallback for accessibility
- Safe to ignore messaging for unsolicited emails

## Implementation

### Files Modified/Created

1. **`src/server/utils/email-templates.ts`** - New email template generator
2. **`src/server/auth.ts`** - Updated with custom `sendVerificationRequest`
3. **`src/server/auth-dynamic.ts`** - Updated for database-configured email providers
4. **`src/server/utils/email-preview.ts`** - Development utility for previewing templates

### NextAuth Configuration

Both static and dynamic auth configurations now include custom `sendVerificationRequest` callbacks that:

1. Create a Nodemailer transport instance
2. Generate branded HTML and text email content
3. Send the email with custom styling
4. Handle errors gracefully

### Email Content

The email includes:
- **Subject**: "🎅 Sign in to [hostname] - Your Magic Link is Here!"
- **HTML Version**: Fully styled with CSS, gradients, and responsive design
- **Text Version**: Clean, accessible plain text alternative

## Usage

### For Environment Variable Configuration
Magic links will automatically use the custom template when email is configured via environment variables:
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`
- `EMAIL_FROM`

### For Database Configuration
Magic links will use the custom template when email providers are configured in the database through the admin panel.

### Testing the Template

1. **Preview**: Run the preview generator:
   ```bash
   npx tsx src/server/utils/email-preview.ts
   ```
   This creates `email-preview.html` in the project root.

2. **Live Testing**: 
   - Start the development server
   - Navigate to the sign-in page
   - Enter an email address for magic link authentication
   - Check your email for the Christmas-themed template

## Customization

### Changing Colors
Edit the CSS gradients in `src/server/utils/email-templates.ts`:
- Header gradient: `linear-gradient(135deg, #dc2626 0%, #16a34a 100%)`
- Background: `linear-gradient(135deg, #fef2f2 0%, #f0fdf4 100%)`
- Button: `linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)`

### Modifying Content
Update the template function in `email-templates.ts` to change:
- Subject line
- Greeting messages
- Button text
- Footer content
- Emojis and decorations

### Adding Seasonal Variations
The template can be easily modified for different seasons or themes by updating:
- Color schemes
- Emoji selections
- Messaging tone
- Background patterns

## Browser Compatibility

The email template is designed to work across all major email clients:
- Gmail (web, mobile, app)
- Outlook (web, desktop, mobile)
- Apple Mail
- Yahoo Mail
- Thunderbird
- And more

## Accessibility

- High contrast colors for readability
- Clear, large fonts
- Plain text alternative provided
- Descriptive alt text for visual elements
- Keyboard-friendly button styling

## Security Considerations

- Links expire after 24 hours
- One-time use only
- Clear security messaging
- Safe fallback text for unknown recipients
- No sensitive information in email content
