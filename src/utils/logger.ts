import type { IncomingMessage, ServerResponse } from 'http';
import pino, { type Bindings } from 'pino';

/**
 * Turbopack-compatible logger configuration
 * Simplified to avoid transport resolution issues during development
 * Made client-safe by avoiding server-side environment imports at module level
 */

// Type definitions for request and response objects
interface LogRequest extends Partial<IncomingMessage> {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  remoteAddress?: string;
  remotePort?: number;
}

interface LogResponse extends Partial<ServerResponse> {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
}

// Safe environment checking that only works on server-side
const getNodeEnv = () => {
  // Only access process.env on server-side
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV ?? 'development';
  }
  return 'development'; // Default for client-side
};

const isProduction = () => getNodeEnv() === 'production';
const isDevelopment = () => getNodeEnv() === 'development';

// Base logger configuration that works with Turbopack
const createBaseLoggerConfig = () => ({
  level: isDevelopment() ? 'debug' : 'warn', // Changed production level from 'info' to 'warn'
  
  // Serializers for consistent log formatting
  serializers: {
    req: (req: LogRequest) => ({
      method: req.method,
      url: req.url,
      headers: isProduction() ? {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        'authorization': req.headers?.authorization ? '[REDACTED]' : undefined
      } : req.headers,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    }),
    res: (res: LogResponse) => ({
      statusCode: res.statusCode,
      headers: res.headers
    }),
    err: (err: Error) => ({
      type: err.constructor.name,
      message: err.message,
      stack: isDevelopment() ? err.stack : undefined
    })  },
  // Redact sensitive information in production
  ...(isProduction() && {
    redact: {
      paths: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'apiKey',
        'authorization',
        'cookie',
        'session',
        'email',
        '*.password',
        '*.token',
        '*.secret',
        'req.headers.authorization',
        'req.headers.cookie'      ],
      censor: '[REDACTED]'
    }
  }),
  
  // Add environment metadata
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: Bindings) => ({
      pid: bindings.pid as number | undefined,
      hostname: bindings.hostname as string | undefined,
      environment: getNodeEnv(),
      service: 'raosanta'
    })
  }
});

/**
 * Create the base logger with simplified configuration for Turbopack compatibility
 */
const createBaseLogger = () => {
  const baseLoggerConfig = createBaseLoggerConfig();
  
  if (isDevelopment()) {
    // Development: Use basic Pino without transport to avoid Turbopack issues
    // The logs will be in JSON format but still readable in development
    return pino({
      ...baseLoggerConfig,
      // Remove any transport configuration to avoid Turbopack worker issues
      level: 'debug', // More verbose in development
    });
  } else {
    // Production: Structured JSON logging
    return pino(baseLoggerConfig);
  }
};

const baseLogger = createBaseLogger();

// Import BetterStack integration
import { createBetterStackWrapper } from './betterstack-logger';

// Wrap the logger with BetterStack integration if in production
const wrappedLogger = isProduction() 
  ? createBetterStackWrapper(baseLogger) 
  : baseLogger;

// Export the main logger
export const logger = wrappedLogger;

// Create specialized loggers for different components
export const createChildLogger = (component: string, additionalContext?: Record<string, unknown>) => {
  const childLogger = baseLogger.child({ 
    component,
    ...additionalContext 
  });
  
  // Wrap child loggers with BetterStack integration in production
  return isProduction() 
    ? createBetterStackWrapper(childLogger)
    : childLogger;
};

// Specialized loggers for common use cases
export const loggers = {
  // Authentication related logs
  auth: createChildLogger('auth'),
  
  // API/tRPC related logs
  api: createChildLogger('api'),
  
  // Database operations
  database: createChildLogger('database'),
  
  // Email operations
  email: createChildLogger('email'),
  
  // OAuth provider operations
  oauth: createChildLogger('oauth'),
  
  // Image/file operations
  storage: createChildLogger('storage'),
  
  // Performance monitoring
  performance: createChildLogger('performance'),
  
  // Security related logs
  security: createChildLogger('security'),
  
  // Application errors
  error: createChildLogger('error'),
  
  // Admin operations
  admin: createChildLogger('admin'),
};

// Utility functions for common logging patterns
export const logUtils = {
  // Log API requests with timing
  logApiRequest: (method: string, endpoint: string, userId?: string, additionalData?: Record<string, unknown>) => {
    loggers.api.info({
      method,
      endpoint,
      userId,
      ...additionalData,
    }, `API Request: ${method} ${endpoint}`);
  },

  // Log API responses with timing
  logApiResponse: (method: string, endpoint: string, statusCode: number, duration: number, userId?: string) => {
    const level = statusCode >= 400 ? 'warn' : statusCode >= 500 ? 'error' : 'info';
    loggers.api[level]({
      method,
      endpoint,
      statusCode,
      duration,
      userId,
    }, `API Response: ${method} ${endpoint} - ${statusCode} (${duration}ms)`);
  },

  // Log authentication events
  logAuthEvent: (event: string, userId?: string, provider?: string, additionalData?: Record<string, unknown>) => {
    loggers.auth.info({
      event,
      userId,
      provider,
      ...additionalData,
    }, `Auth Event: ${event}`);
  },

  // Log OAuth events
  logOAuthEvent: (event: string, provider: string, additionalData?: Record<string, unknown>) => {
    loggers.oauth.info({
      event,
      provider,
      ...additionalData,
    }, `OAuth Event: ${event} - ${provider}`);
  },
  // Log database operations
  logDatabaseOperation: (operation: string, table: string, duration?: number, additionalData?: Record<string, unknown>) => {
    loggers.database.debug({
      operation,
      table,
      duration,
      ...additionalData,
    }, `DB Operation: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`);
  },

  // Log performance metrics
  logPerformance: (metric: string, value: number, unit = 'ms', additionalData?: Record<string, unknown>) => {
    loggers.performance.info({
      metric,
      value,
      unit,
      ...additionalData,
    }, `Performance: ${metric} = ${value}${unit}`);
  },

  // Log security events
  logSecurityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', additionalData?: Record<string, unknown>) => {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    loggers.security[level]({
      event,
      severity,
      ...additionalData,
    }, `Security Event: ${event} (${severity})`);
  },
  // Log errors with proper context
  logError: (error: unknown, context: string, additionalData?: Record<string, unknown>) => {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : { error: String(error) };

    loggers.error.error({
      ...errorObj,
      context,
      ...additionalData,
    }, `Error in ${context}: ${errorObj.message ?? String(error)}`);
  },

  // Log admin actions
  logAdminAction: (action: string, adminId: string, targetId?: string, additionalData?: Record<string, unknown>) => {
    loggers.admin.warn({
      action,
      adminId,
      targetId,
      ...additionalData,
    }, `Admin Action: ${action} by ${adminId}${targetId ? ` on ${targetId}` : ''}`);
  },
};

// Export the main logger as default
export default logger;
