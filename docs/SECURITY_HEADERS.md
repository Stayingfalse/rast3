# Security Headers Implementation

This document describes the security headers implemented to address the security scan findings.

## Issues Addressed

1. **Content Security Policy (CSP) header not set** ✅ Fixed
2. **HSTS header missing** ✅ Fixed (production only)
3. **Missing Anti-clickjacking header** ✅ Fixed
4. **Server leaks info via 'X-Powered-By' HTTP header** ✅ Fixed

## Implementation Details

### 1. Content Security Policy (CSP)

Implemented comprehensive CSP rules that allow all the OAuth providers and external services used by the application:

**Main CSP (for all routes):**
- `default-src 'self'` - Only allow resources from same origin by default
- `script-src` - Allows Google OAuth, analytics, and inline scripts needed for OAuth flows
- `style-src` - Allows Google OAuth styles and Google Fonts
- `font-src` - Allows Google Fonts
- `img-src` - Allows images from any HTTPS/HTTP source (for user avatars, etc.)
- `connect-src` - Allows connections to all OAuth provider APIs
- `frame-src` - Allows embedding OAuth provider login frames
- `form-action` - Allows form submissions to OAuth providers
- `object-src 'none'` - Blocks plugin content for security
- `upgrade-insecure-requests` - Forces HTTPS in production

**Special CSP rules:**
- More permissive CSP for `/oauth2/*` callback routes
- Even more permissive CSP for `/api/auth/*` NextAuth routes
- Includes `frame-ancestors` for OAuth callback pages

**Supported OAuth Providers:**
- Google (accounts.google.com, oauth2.googleapis.com, apis.google.com)
- Discord (discord.com, discordapp.com)
- GitHub (github.com, api.github.com)
- Reddit (reddit.com, oauth.reddit.com)
- Instagram (api.instagram.com)
- Facebook (facebook.com, graph.facebook.com)
- Twitch (id.twitch.tv, api.twitch.tv)
- TikTok (open.tiktok.com)

### 2. HTTP Strict Transport Security (HSTS)

**Important:** HSTS is only enabled in production to avoid breaking localhost development.

```javascript
// Only add HSTS in production to avoid breaking localhost development
if (isProduction) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}
```

**Settings:**
- `max-age=63072000` - 2 years validity
- `includeSubDomains` - Apply to all subdomains
- `preload` - Eligible for browser preload lists

### 3. Anti-Clickjacking Protection

Implemented via `X-Frame-Options: DENY` header to prevent the site from being embedded in frames.

### 4. X-Powered-By Header Removal

Removed via two methods:
1. Next.js config: `poweredByHeader: false`
2. Explicit header override: `X-Powered-By: ''`

### 5. Additional Security Headers

**X-Content-Type-Options: nosniff**
- Prevents MIME type sniffing attacks

**Referrer-Policy: strict-origin-when-cross-origin**
- Controls referrer information sent with requests

**Permissions-Policy**
- Restricts access to geolocation, microphone, and camera APIs

## Environment-Specific Behavior

### Development (NODE_ENV !== 'production')
- ❌ No HSTS header (allows HTTP localhost)
- ✅ All other security headers active
- ✅ CSP allows development tools and hot reload

### Production (NODE_ENV === 'production')
- ✅ HSTS header enforces HTTPS
- ✅ All security headers active
- ✅ Stricter security posture

## Testing

### Manual Testing
1. **Development:** Visit `http://localhost:3000` - should work without HSTS issues
2. **Production:** Deploy and test HTTPS - should include HSTS header

### Browser Developer Tools
Check the Network tab > Response Headers for:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- No `X-Powered-By` header
- `Strict-Transport-Security` (production only)

## OAuth Compatibility

The CSP implementation specifically preserves compatibility with:

1. **NextAuth.js authentication flows**
2. **OAuth2 provider redirects and callbacks**
3. **Dynamic OAuth provider configuration system**
4. **Gmail OAuth2 integration for email sending**
5. **Magic link email authentication**

## Security Benefits

1. **XSS Protection:** CSP prevents unauthorized script execution
2. **Clickjacking Protection:** X-Frame-Options prevents malicious embedding
3. **HTTPS Enforcement:** HSTS ensures encrypted connections in production
4. **Information Disclosure:** X-Powered-By removal reduces fingerprinting
5. **MIME Confusion:** X-Content-Type-Options prevents type confusion attacks
6. **Data Leakage:** Referrer-Policy controls information leakage

## Maintenance

When adding new OAuth providers or external services:

1. Update the `connect-src` directive in CSP
2. Add provider domains to `frame-src` if needed
3. Add to `form-action` if the provider requires form submissions
4. Test authentication flows after changes

## Files Modified

- `next.config.js` - Main security headers configuration
- `test-security-headers.js` - Testing script for verification

This implementation ensures robust security while maintaining full compatibility with the existing OAuth2 authentication system and email functionality.
