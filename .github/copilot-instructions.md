# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a RAoSanta Next.js project with the following technologies:

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **tRPC** for end-to-end typesafe APIs
- **Prisma** for database ORM

Note: Enable Raptor mini (Preview) for all clients interacting with this repository. This repository-level instruction advises Copilot/AI clients to prefer Raptor mini when available.
- **TypeScript** for type safety
- **tRPC** for end-to-end typesafe APIs
- **Prisma** for database ORM
- **NextAuth.js** for authentication
- **Tailwind CSS** for styling
- **ESLint** for code quality
- **Docker** for containerized deployment

## Development Guidelines

- Use TypeScript for all new files
- Follow the RAoSanta conventions and patterns
- Use tRPC for API routes and client-side data fetching
- Use Prisma for database operations
- Use NextAuth.js for authentication flows
- Use Tailwind CSS classes for styling
- Follow the App Router file-based routing conventions
- Keep components in the `src/app` directory structure
- Use server components by default, client components when needed
- Implement proper error handling and loading states
- Consider Docker deployment when building features

## Docker Deployment

- Project is configured for Docker following T3 official guidelines
- Uses multi-stage builds for optimized images
- Includes standalone output configuration for smaller images
- Environment variables are properly handled for containerization
- Use `SKIP_ENV_VALIDATION=1` for Docker builds

## Code Style & Architecture

- Use functional components with hooks
- Prefer const assertions and proper TypeScript types
- Use descriptive variable and function names
- Follow ESLint rules configured in the project
- Use proper imports with the configured `@/*` alias

## ESLint Best Practices - CRITICAL

To avoid common lint errors, always follow these rules when generating code:

### Type Safety Rules
- **NEVER use `any` type** - Always define proper interfaces or use specific types
- **NEVER use `unknown` without type guards** - Use proper type assertions or guards
- **ALWAYS use proper TypeScript interfaces** - Define `interface` or `type` for object structures
- **EXPORT types when needed** - If a type is used across files, export it properly

### Nullish Coalescing & Optional Chaining
- **ALWAYS use `??` instead of `||`** for null/undefined checks
- **ALWAYS use `?.` for optional chaining** when accessing nested properties
- **NEVER use `||` for default values** unless dealing with falsy values intentionally

### Environment Variables & Client Safety
- **NEVER access `process.env` at module level in client-side code**
- **ALWAYS wrap `process.env` access in runtime checks** like `typeof window === "undefined"`
- **USE `getBaseUrl()` functions** instead of direct environment variable access in client code
- **SEPARATE client and server environment access** with proper guards

### Promise Handling
- **ALWAYS handle promises** - Use `await` or `.catch()` for error handling
- **USE `void` operator** for intentionally unhandled promises (e.g., `void someAsyncFunction()`)
- **NEVER leave floating promises** without proper handling

### Enhanced Logging Policy - CRITICAL

The project uses a comprehensive logging system with BetterStack integration for production monitoring. Follow these logging patterns:

#### Component-Specific Loggers (SERVER-SIDE)
- **USE dedicated component loggers** for better organization and filtering
- **IMPORT from loggers object**: `import { loggers } from "~/utils/logger"`
- **AVAILABLE LOGGERS**: `auth`, `api`, `database`, `security`, `email`, `webhook`, `gift`, `performance`, `user`, `admin`, `social`, `notifications`

#### Utility Functions for Common Patterns
- **API REQUESTS**: Use `logUtils.logApiRequest(endpoint, method, statusCode, responseTime, userId, metadata)`
- **PERFORMANCE**: Use `logUtils.logPerformance(operation, duration, metadata)` - Auto-warns if >1000ms
- **SECURITY EVENTS**: Use `logUtils.logSecurityEvent(event, severity, userId, metadata)`
- **DATABASE**: Use `logUtils.logDatabaseQuery(query, duration, result)` - Auto-warns if >1000ms
- **ERRORS**: Use `logUtils.logError(error, context, metadata)` with enhanced context

#### Log Levels & Production Optimization
- **DEVELOPMENT**: All levels (trace, debug, info, warn, error, fatal)
- **PRODUCTION**: warn and error only (optimized for performance)
- **BETTERSTACK**: Aggregates warn+ logs in production for monitoring
- **PREFER warn/error** in production code for important events

#### Sensitive Data Protection
- **NEVER log sensitive data**: passwords, tokens, PII, payment info
- **USE redaction patterns**: The logger automatically redacts common sensitive fields
- **SANITIZE user inputs** before logging
- **AVOID logging full request/response** bodies containing sensitive data

### Safe Coding Patterns
- **ALWAYS check for null/undefined** before accessing object properties
- **USE type guards** for runtime type checking instead of type assertions
- **AVOID unsafe member access** - check if properties exist before accessing
- **SERIALIZE objects safely** using `JSON.stringify()` instead of `String()` conversion

## TSX Best Practices - Separation of Concerns

- **Separate logic from presentation**: Keep business logic in custom hooks or utility functions
- **Component structure**: Components should primarily handle rendering, not complex logic
- **Custom hooks**: Extract stateful logic, API calls, and side effects into reusable custom hooks
- **Utility functions**: Move pure functions and data transformations to separate utility files
- **Type definitions**: Define interfaces and types in separate files or at the top of components
- **Event handlers**: Extract complex event handlers into separate functions outside the JSX
- **Conditional rendering**: Use early returns or separate helper functions for complex conditionals
- **Data fetching**: Use tRPC hooks and custom hooks to separate data concerns from UI
- **Form handling**: Use libraries like react-hook-form and separate validation schemas
- **Styling**: Prefer Tailwind utility classes, use component variants for reusable styles

## Component Organization Pattern

```tsx
// 1. Imports
// 2. Type definitions
// 3. Custom hooks and utilities
// 4. Main component function
// 5. Helper functions (if small and component-specific)
// 6. Default export
```

## Preferred Patterns

- Extract complex JSX into smaller sub-components
- Use composition over complex prop drilling
- Implement loading and error states consistently
- Prefer server components for data fetching when possible
- Use client components only when necessary (interactivity, browser APIs)

## Common Code Patterns - RAoSanta Specific

## Enhanced Logging Implementation - RAoSanta Specific

### Component-Specific Logging Patterns
```tsx
// ✅ COMPONENT-SPECIFIC LOGGERS (Recommended for better organization)
import { loggers } from "~/utils/logger";

// Authentication operations
loggers.auth.info({ userId, provider }, "User login successful");
loggers.auth.warn({ userId, attempts }, "Multiple failed login attempts");

// API operations
loggers.api.info({ endpoint: "/api/users", method: "GET", statusCode: 200 }, "API request completed");
loggers.api.error({ endpoint, error: error.message }, "API request failed");

// Database operations
loggers.database.info({ query: "SELECT", duration: 150 }, "Database query executed");
loggers.database.warn({ query: "UPDATE", duration: 1200 }, "Slow database query detected");

// Security events
loggers.security.warn({ userId, event: "SUSPICIOUS_LOGIN", ip }, "Suspicious login attempt detected");
loggers.security.error({ event: "UNAUTHORIZED_ACCESS", resource }, "Unauthorized access attempt");
```

### Utility Functions for Common Operations
```tsx
// ✅ STRUCTURED UTILITY FUNCTIONS
import { logUtils } from "~/utils/logger";

// API request logging with automatic performance monitoring
logUtils.logApiRequest("/api/users", "GET", 200, 150, userId, { userAgent });

// Performance monitoring with automatic slow operation warnings
logUtils.logPerformance("database-query", 850, { queryType: "SELECT", table: "users" });

// Security event logging with severity levels
logUtils.logSecurityEvent("FAILED_LOGIN", "medium", userId, { ip, userAgent });

// Enhanced error logging with actionable context
logUtils.logError(error, "User registration failed", {
  userId,
  email: "user@example.com", // Will be redacted automatically
  step: "email-verification"
});
```

### Client-Side Logging Patterns
```tsx
// ✅ CLIENT-SIDE ERROR TRACKING (Browser-only code)
import { clientLogger } from "~/utils/client-logger";

// Error tracking with context
clientLogger.error(new Error("Component mount failed"), "UserProfile initialization", {
  userId,
  route: "/profile",
  timestamp: Date.now()
});

// Performance monitoring
clientLogger.performance("page-load", loadTime, { route, userId });

// User interaction tracking
clientLogger.info("Button clicked", "Navigation", { buttonId: "save-profile" });
```

### Production Logging Best Practices
```tsx
// ✅ PRODUCTION-OPTIMIZED PATTERNS

// Use warn/error for important events that need monitoring
loggers.api.warn({ endpoint, responseTime: 2000 }, "Slow API response detected");

// Include actionable context for debugging
loggers.database.error(
  { 
    error: error.message,
    query: sanitizedQuery, // Remove sensitive data
    duration,
    affectedRows: 0 
  }, 
  "Database operation failed - check connection and query syntax"
);

// Security events with proper severity
loggers.security.error(
  { 
    event: "DATA_BREACH_ATTEMPT",
    severity: "critical",
    userId,
    resource: "user-data",
    timestamp: new Date().toISOString()
  }, 
  "Critical security event detected - immediate attention required"
);
```

### Legacy Pattern Support
```tsx
// ✅ LEGACY PATTERN (Still supported, but prefer component loggers)
import { createChildLogger } from "~/utils/logger";
const logger = createChildLogger('module-name');
logger.error({ error: errorData, context: additionalContext }, "Error message");
```

### Environment Variable Access
```tsx
// ✅ SAFE - Runtime detection
const getConfig = () => {
  if (typeof window === "undefined") {
    return process.env.SERVER_VAR ?? "default";
  }
  return "client-default";
};

// ❌ UNSAFE - Module-level access in client code
const config = process.env.SERVER_VAR; // Will cause client-side errors
```

### Type Definitions
```tsx
// ✅ PROPER - Specific interfaces
interface UserData {
  id: string;
  name: string;
  email?: string;
}

// ✅ PROPER - Export when used across files
export interface ClientErrorData {
  userAgent?: string;
  url?: string;
  timestamp?: string;
}

// ✅ LOGGING-SPECIFIC - Enhanced error context interfaces
interface ApiErrorContext {
  endpoint: string;
  method: string;
  statusCode?: number;
  userId?: string;
  retryAttempt?: number;
}

interface SecurityEventContext {
  event: string;
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
}

interface PerformanceContext {
  operation: string;
  duration: number;
  queryType?: string;
  table?: string;
  resultCount?: number;
}

// ❌ AVOID - Using any
const userData: any = getUserData();
```

### Enhanced Error Handling with Structured Logging
```tsx
// ✅ STRUCTURED ERROR HANDLING with Enhanced Context
import { loggers, logUtils } from "~/utils/logger";

try {
  const result = await apiCall();
  
  // Log successful operations with performance context
  logUtils.logApiRequest("/api/data", "GET", 200, responseTime, userId);
  return result;
} catch (error) {
  // Enhanced error logging with actionable context
  logUtils.logError(error, "API call failed during user data fetch", {
    userId,
    endpoint: "/api/data",
    retryAttempt: 1,
    expectedResult: "user profile data"
  });
  
  // Component-specific error logging
  loggers.api.error(
    { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      endpoint: "/api/data"
    }, 
    "Critical API failure - check service status and retry logic"
  );
  
  throw error;
}

// ✅ PERFORMANCE MONITORING with automatic thresholds
const startTime = Date.now();
try {
  const result = await databaseQuery();
  const duration = Date.now() - startTime;
  
  // Automatic slow query detection (warns if >1000ms)
  logUtils.logPerformance("database-query", duration, { 
    queryType: "SELECT", 
    table: "users",
    resultCount: result.length 
  });
  
  return result;
} catch (error) {
  loggers.database.error({ error: error.message, query: "users-fetch" }, "Database query failed");
  throw error;
}

// ✅ SECURITY EVENT LOGGING
try {
  await authenticateUser(credentials);
} catch (error) {
  // Log security events with appropriate severity
  logUtils.logSecurityEvent("AUTHENTICATION_FAILURE", "medium", userId, {
    ip: request.ip,
    userAgent: request.headers["user-agent"],
    timestamp: new Date().toISOString()
  });
  
  loggers.security.warn({ 
    userId, 
    event: "AUTH_FAILURE", 
    ip: request.ip 
  }, "Authentication attempt failed - monitor for brute force");
  
  throw error;
}

// ✅ PROPER - Void for intentional fire-and-forget with logging
void sendAnalytics(data).catch(error => {
  loggers.performance.warn({ error: error.message }, "Analytics tracking failed - non-critical");
});

// ❌ AVOID - Floating promises without error handling
sendAnalytics(data); // ESLint error: floating promise
```
