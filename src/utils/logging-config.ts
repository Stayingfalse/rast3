/**
 * Log aggregation and output configuration
 * Handles log rotation, external service integration, and production logging
 */

import { env } from "~/env";
import type { LoggerOptions, Bindings } from 'pino';
import type { IncomingMessage, ServerResponse } from 'http';

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

/**
 * Production logging configuration
 * Optimized for structured logging, log aggregation, and monitoring
 */
export const productionLoggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  
  // Structured JSON output for production
  serializers: {
    req: (req: LogRequest) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        'authorization': req.headers?.authorization ? '[REDACTED]' : undefined
      },
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
      stack: err.stack
    })
  },

  // Redact sensitive information
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
      'creditCard',
      'ssn',
      '*.password',
      '*.token',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie'
    ],
    censor: '[REDACTED]'
  },  // Add timestamp and hostname
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label: string) => ({ level: label }),    bindings: (bindings: Bindings) => ({
      pid: bindings.pid as number | undefined,
      hostname: bindings.hostname as string | undefined,
      environment: env.NODE_ENV
    })
  }
};

/**
 * Development logging configuration  
 * Human-readable output with colors and formatting
 */
export const developmentLoggerConfig: LoggerOptions = {
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{levelLabel} - {msg}',
      customPrettifiers: {
        time: (timestamp: string) => `🕐 ${timestamp}`,
        level: (logLevel: string) => {
          const levels: Record<string, string> = {
            10: '🔍 TRACE',
            20: '🐛 DEBUG', 
            30: 'ℹ️  INFO',
            40: '⚠️  WARN',
            50: '❌ ERROR',
            60: '💥 FATAL'
          };
          return levels[logLevel] ?? logLevel;
        }
      }
    }
  }
};

/**
 * Log rotation configuration for production
 * Prevents log files from growing too large
 */
export const logRotationConfig = {
  // Rotate daily
  frequency: 'daily',
  // Keep 30 days of logs
  retention: 30,
  // Maximum file size before rotation (100MB)
  maxFileSize: '100M',
  // Compress old log files
  compress: true,
  // Log file path pattern
  dateFormat: 'YYYY-MM-DD',
  filenamePattern: 'app-%DATE%.log'
};

/**
 * External logging service configuration
 * For integration with services like BetterStack, Sentry, DataDog, etc.
 */
export const externalLoggingConfig = {
  // BetterStack configuration
  betterstack: {
    enabled: !!process.env.BETTERSTACK_SOURCE_TOKEN,
    sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN,
    endpoint: process.env.BETTERSTACK_ENDPOINT ?? 'https://s1340543.eu-nbg-2.betterstackdata.com',
    // Additional BetterStack options
    options: {
      batchSize: 100,
      flushTimeout: 5000,
      metadata: {
        service: 'raosanta',
        environment: env.NODE_ENV,
        version: process.env.npm_package_version ?? '0.1.5'
      }
    }
  },

  // Sentry configuration
  sentry: {
    enabled: env.NODE_ENV === 'production' && !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0
  },

  // DataDog configuration (if using)
  datadog: {
    enabled: false, // Set to true if using DataDog
    apiKey: process.env.DATADOG_API_KEY,
    service: 'raosanta',
    environment: env.NODE_ENV,
    version: process.env.APP_VERSION ?? '1.0.0'
  },

  // Custom webhook for log aggregation
  webhook: {
    enabled: !!process.env.LOG_WEBHOOK_URL,
    url: process.env.LOG_WEBHOOK_URL,
    batchSize: 10,
    flushInterval: 5000 // 5 seconds
  }
};

/**
 * Log level configuration based on environment
 */
export const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  
  switch (env.NODE_ENV) {
    case 'development':
      return 'debug';
    case 'test':
      return 'warn';
    case 'production':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Create log transport configuration based on environment
 */
export const createLogTransports = () => {
  const transports: unknown[] = [];

  // BetterStack transport (enabled in all environments if token is provided)
  if (externalLoggingConfig.betterstack.enabled) {
    transports.push({
      target: '@logtail/pino',
      options: {
        sourceToken: externalLoggingConfig.betterstack.sourceToken,
        options: {
          endpoint: externalLoggingConfig.betterstack.endpoint,
          ...externalLoggingConfig.betterstack.options
        }
      }
    });
  }

  if (env.NODE_ENV === 'production') {
    // Console output for containerized environments (if not using BetterStack only)
    if (!externalLoggingConfig.betterstack.enabled) {
      transports.push({
        target: 'pino/file',
        options: { destination: 1 } // stdout
      });
    }

    // File output with rotation (if not containerized)
    if (process.env.LOG_TO_FILE === 'true') {
      transports.push({
        target: 'pino-roll',
        options: {
          file: './logs/app.log',
          frequency: logRotationConfig.frequency,
          size: logRotationConfig.maxFileSize,
          limit: {
            count: logRotationConfig.retention
          }
        }
      });
    }

    // External service transport
    if (externalLoggingConfig.webhook.enabled) {
      transports.push({
        target: './log-webhook-transport',
        options: {
          url: externalLoggingConfig.webhook.url,
          batchSize: externalLoggingConfig.webhook.batchSize,
          flushInterval: externalLoggingConfig.webhook.flushInterval
        }
      });
    }
  }

  return transports.length > 1 ? {
    targets: transports
  } : transports[0];
};

/**
 * Performance monitoring configuration
 */
export const performanceConfig = {
  // Log slow API requests (threshold in milliseconds)
  slowRequestThreshold: 1000,
  
  // Log slow database queries (threshold in milliseconds)  
  slowQueryThreshold: 500,
  
  // Memory usage monitoring
  memoryMonitoring: {
    enabled: env.NODE_ENV === 'production',
    interval: 60000, // Check every minute
    threshold: 80 // Log warning if memory usage > 80%
  },

  // Custom metrics collection
  customMetrics: {
    enabled: true,
    collectInterval: 30000, // Collect metrics every 30 seconds
    metrics: [
      'activeConnections',
      'requestsPerSecond',
      'errorRate',
      'cacheHitRate'
    ]
  }
};

/**
 * Security logging configuration
 */
export const securityConfig = {
  // Log all authentication attempts
  logAuthAttempts: true,
  
  // Log failed login attempts
  logFailedLogins: true,
  
  // Log privilege escalations
  logPrivilegeChanges: true,
  
  // Log suspicious activities
  suspiciousActivityDetection: {
    enabled: true,
    maxFailedLogins: 5,
    timeWindow: 300000, // 5 minutes
    ipWhitelist: process.env.IP_WHITELIST?.split(',') ?? []
  },

  // Rate limiting logging
  rateLimiting: {
    enabled: true,
    logViolations: true,
    alertThreshold: 100 // Alert if rate limit exceeded 100 times
  }
};

/**
 * Compliance and audit logging
 */
export const auditConfig = {
  // Enable audit logging for compliance
  enabled: process.env.AUDIT_LOGGING === 'true',
  
  // Retention period for audit logs (in days)
  retentionDays: 2555, // 7 years for compliance
  
  // Events to audit
  auditEvents: [
    'user.created',
    'user.deleted',
    'user.role_changed',
    'admin.settings_changed',
    'data.exported',
    'data.deleted',
    'security.breach_detected',
    'system.configuration_changed'
  ],

  // Include sensitive data in audit logs (with proper redaction)
  includeSensitiveData: false,
    // Immutable audit log storage
  immutableStorage: process.env.AUDIT_IMMUTABLE_STORAGE === 'true'
};
