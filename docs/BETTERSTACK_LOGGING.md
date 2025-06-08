# BetterStack Logging Integration

## Overview

RAoSanta now includes comprehensive logging with BetterStack integration for production-grade log management, monitoring, and analysis.

## Features

### 🎯 **Core Capabilities**
- **Structured JSON Logging**: Production-optimized log format
- **Environment-Based Configuration**: Different settings for dev/prod
- **BetterStack Integration**: Real-time log streaming to BetterStack
- **Sensitive Data Redaction**: Automatic security for passwords, tokens, etc.
- **Component-Specific Loggers**: Specialized loggers for different parts of the app
- **Performance Monitoring**: Built-in performance metrics tracking
- **Security Event Logging**: Comprehensive security monitoring
- **Client-Side Logging**: Browser error tracking and performance monitoring

### 🔧 **Configuration**

#### Environment Variables
Add these to your `.env` file:

```bash
# BetterStack Logging (Required for external logging)
BETTERSTACK_SOURCE_TOKEN="your-source-token-here"
BETTERSTACK_ENDPOINT="https://your-endpoint.betterstackdata.com"

# Optional Configuration
LOG_LEVEL="info"              # debug, info, warn, error
LOG_TO_FILE="true"           # Enable file logging in production
```

#### Current Configuration
- **Source Token**: `fp5ZHG1xBxoPCoe3a6fSzCP6`
- **Endpoint**: `https://s1340543.eu-nbg-2.betterstackdata.com`
- **Log Level**: `debug` (development) / `info` (production)

## Usage Examples

### Basic Logging

```typescript
import { loggers, logUtils } from '~/utils/logger';

// Authentication events
loggers.auth.info('User signed in', { 
  userId: '123', 
  provider: 'discord',
  ip: '192.168.1.100'
});

// API operations
loggers.api.warn('Slow API response', { 
  endpoint: '/api/kudos',
  method: 'POST',
  duration: 1500,
  statusCode: 200
});

// Database operations
loggers.database.debug('Query executed', {
  query: 'SELECT * FROM users WHERE active = ?',
  duration: 45,
  rowCount: 150
});

// Security events
loggers.security.error('Failed login attempt', {
  severity: 'high',
  ip: '192.168.1.100',
  attempts: 5,
  userId: 'attempted-user-123'
});
```

### Utility Functions

```typescript
// API request/response logging
logUtils.logApiRequest('POST', '/api/kudos', 'user-123', { 
  duration: 245, 
  status: 201 
});

// Performance metrics
logUtils.logPerformance('page_load', 850, 'ms', { 
  page: '/admin/settings',
  cacheHit: true
});

// Error logging with context
logUtils.logError(error, 'oauth-callback', { 
  provider: 'google', 
  userId: '456',
  redirectUrl: '/dashboard'
});

// Admin action auditing
logUtils.logAdminAction('user_banned', 'admin-789', 'user-123', { 
  reason: 'spam',
  duration: '7d'
});

// Security event monitoring
logUtils.logSecurityEvent('failed_login', 'medium', { 
  ip: '192.168.1.100', 
  attempts: 3,
  userAgent: 'Mozilla/5.0...'
});
```

### Client-Side Logging

```typescript
import { useClientLogger } from '~/utils/client-logger';

function MyComponent() {
  const { logError, logPerformance, logInteraction } = useClientLogger();

  const handleClick = () => {
    logInteraction('button_click', 'kudos-submit', { 
      page: '/dashboard',
      kudosId: '123'
    });
  };

  useEffect(() => {
    logPerformance('component_mount', Date.now() - startTime, {
      component: 'MyComponent'
    });
  }, []);

  return <button onClick={handleClick}>Submit Kudos</button>;
}
```

## Log Categories

### 🔐 **Authentication** (`loggers.auth`)
- User sign-ins/sign-outs
- Provider authentication events
- Session management
- Email verification

### 🌐 **API Operations** (`loggers.api`)
- Request/response logging
- Performance monitoring
- Rate limiting events
- Error responses

### 🗄️ **Database** (`loggers.database`)
- Query execution times
- Connection events
- Migration logs
- Performance warnings

### 🔑 **OAuth** (`loggers.oauth`)
- Provider callbacks
- Token exchanges
- Authorization flows
- Configuration changes

### 📁 **Storage** (`loggers.storage`)
- File uploads/downloads
- Cache operations
- CDN interactions
- Storage errors

### ⚡ **Performance** (`loggers.performance`)
- Page load times
- API response times
- Cache hit rates
- Memory usage

### 🛡️ **Security** (`loggers.security`)
- Failed login attempts
- Suspicious activities
- Rate limit violations
- Security policy violations

### ❌ **Errors** (`loggers.error`)
- Application errors
- Uncaught exceptions
- API failures
- Client-side errors

### 👑 **Admin** (`loggers.admin`)
- Administrative actions
- User management
- System configuration changes
- Audit trail events

## BetterStack Dashboard

### Access Your Logs
1. **Login**: https://logs.betterstack.com/
2. **Source**: RAoSanta Application
3. **Token**: `fp5ZHG1xBxoPCoe3a6fSzCP6`

### Useful Queries

```bash
# All authentication events
component:auth

# API errors only
component:api AND level:error

# Security events by severity
component:security AND severity:high

# Performance issues
component:performance AND value:>1000

# Specific user activity
userId:"user-123"

# Recent errors
level:error AND @timestamp:>now-1h

# Admin actions
component:admin
```

### Alerts Setup

You can set up alerts in BetterStack for:
- **High Error Rates**: More than 10 errors per minute
- **Security Events**: Any high/critical severity security events
- **Performance Degradation**: API responses > 2 seconds
- **Failed Logins**: More than 5 failed attempts from same IP

## Development vs Production

### Development Mode
- **Console Output**: Pretty-printed, colorized logs
- **BetterStack**: Info level and above sent to BetterStack
- **Log Level**: Debug (all logs visible)
- **Sensitive Data**: Not redacted (for debugging)

### Production Mode
- **Console Output**: Structured JSON logs
- **BetterStack**: All configured levels sent
- **Log Level**: Info (reduced verbosity)
- **Sensitive Data**: Automatically redacted

## Security Features

### Automatic Data Redaction
The following fields are automatically redacted in production:
- `password`, `token`, `secret`
- `authorization`, `cookie`, `session`
- `apiKey`, `accessToken`, `refreshToken`
- `email` (in sensitive contexts)
- Custom sensitive fields

### Security Event Monitoring
- Failed login attempts tracking
- Rate limit violation logging
- Suspicious activity detection
- IP-based monitoring
- User agent analysis

## Performance Monitoring

### Automatic Metrics
- API request/response times
- Database query performance
- Page load times
- Cache hit rates
- Memory usage patterns

### Custom Metrics
```typescript
logUtils.logPerformance('custom_operation', duration, 'ms', {
  operationType: 'data_processing',
  recordCount: 1000,
  cacheUsed: true
});
```

## Troubleshooting

### Logs Not Appearing in BetterStack
1. **Check Token**: Verify `BETTERSTACK_SOURCE_TOKEN` is correct
2. **Check Endpoint**: Ensure `BETTERSTACK_ENDPOINT` matches your region
3. **Network Issues**: Ensure server can reach BetterStack endpoints
4. **Log Level**: Verify logs meet the minimum level threshold

### Performance Impact
- **Development**: Minimal impact due to async logging
- **Production**: ~1ms average overhead per log entry
- **BetterStack**: Batched uploads reduce network overhead

### Common Issues
```typescript
// ❌ Don't log sensitive data directly
loggers.auth.info('Login attempt', { password: userPassword });

// ✅ Use structured logging without sensitive data
loggers.auth.info('Login attempt', { 
  userId: user.id, 
  provider: 'discord',
  success: true 
});
```

## Migration from Console Logs

### Before
```typescript
console.log('User logged in:', userId);
console.error('API Error:', error);
```

### After
```typescript
loggers.auth.info('User logged in', { userId });
logUtils.logError(error, 'api-endpoint', { endpoint: '/api/users' });
```

## Best Practices

1. **Use Appropriate Log Levels**
   - `debug`: Development debugging
   - `info`: General information
   - `warn`: Warning conditions
   - `error`: Error conditions
   - `fatal`: System unusable

2. **Include Context**
   - Always include relevant IDs (userId, requestId, etc.)
   - Add timing information for performance logs
   - Include error context and stack traces

3. **Avoid Logging Sensitive Data**
   - Use redaction features
   - Log references instead of actual values
   - Be mindful of compliance requirements

4. **Structure Your Logs**
   - Use consistent field names
   - Include timestamps and request IDs
   - Add relevant metadata

## Support

For issues with logging:
1. Check the console for any pino/BetterStack errors
2. Verify environment variables are set correctly
3. Test with the provided test scripts
4. Check BetterStack status page for service issues

---

## Quick Start Checklist

- [ ] BetterStack source token configured
- [ ] Environment variables set in `.env`
- [ ] Development server started
- [ ] Test logs visible in BetterStack dashboard
- [ ] Alerts configured for critical events
- [ ] Team has access to BetterStack dashboard

Your RAoSanta application now has enterprise-grade logging capabilities! 🎄✨
