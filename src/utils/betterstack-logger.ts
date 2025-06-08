/**
 * BetterStack Logging Integration
 * Separate module to handle BetterStack logging without Turbopack conflicts
 * Made client-safe by avoiding server-side environment imports at module level
 */

import type { Logger } from 'pino';

// Safe environment access for server-side only
const getBetterStackConfig = () => {
  // Only access process.env on server-side
  if (typeof window === 'undefined') {
    return {
      sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN ?? 'fp5ZHG1xBxoPCoe3a6fSzCP6',
      endpoint: process.env.BETTERSTACK_ENDPOINT ?? 'https://s1340543.eu-nbg-2.betterstackdata.com',
      enabled: !!process.env.BETTERSTACK_SOURCE_TOKEN // Enable in any environment if token is provided
    };
  }
  // Client-side - return disabled config
  return {
    sourceToken: '',
    endpoint: '',
    enabled: false
  };
};

// Type definitions for log data
interface LogData {
  level?: string;
  msg?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Send logs to BetterStack via HTTP
 */
export async function sendToBetterStack(logData: LogData): Promise<void> {
  const config = getBetterStackConfig();
  
  if (!config.enabled) {
    return;
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.sourceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dt: new Date().toISOString(),
        level: logData.level ?? 'info',
        message: logData.msg ?? logData.message ?? '',
        service: 'raosanta',
        environment: typeof window === 'undefined' ? (process.env.NODE_ENV ?? 'development') : 'client',
        ...logData
      })
    });

    if (!response.ok) {
      console.error('Failed to send log to BetterStack:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error sending log to BetterStack:', error);
  }
}

/**
 * Create a logger wrapper that sends important logs to BetterStack
 */
export function createBetterStackWrapper(baseLogger: Logger) {
  const shouldSendToBetterStack = (level: string) => {
    // Only send warn, error, and fatal logs to BetterStack to avoid spam
    const config = getBetterStackConfig();
    return ['warn', 'error', 'fatal'].includes(level) && config.enabled;
  };

  return {
    ...baseLogger,
      warn: (obj: LogData | string, msg?: string, ...args: unknown[]) => {
      const result = baseLogger.warn(obj, msg, ...args);
      if (shouldSendToBetterStack('warn')) {
        const serializedMsg = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        void sendToBetterStack({ level: 'warn', msg: serializedMsg, ...(typeof obj === 'object' ? obj : {}) });
      }
      return result;
    },    error: (obj: LogData | string, msg?: string, ...args: unknown[]) => {
      const result = baseLogger.error(obj, msg, ...args);
      if (shouldSendToBetterStack('error')) {
        const serializedMsg = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        void sendToBetterStack({ level: 'error', msg: serializedMsg, ...(typeof obj === 'object' ? obj : {}) });
      }
      return result;
    },    fatal: (obj: LogData | string, msg?: string, ...args: unknown[]) => {
      const result = baseLogger.fatal(obj, msg, ...args);
      if (shouldSendToBetterStack('fatal')) {
        const serializedMsg = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        void sendToBetterStack({ level: 'fatal', msg: serializedMsg, ...(typeof obj === 'object' ? obj : {}) });
      }
      return result;
    },    info: (obj: LogData | string, msg?: string, ...args: unknown[]) => {
      const result = baseLogger.info(obj, msg, ...args);
      // Optionally send critical info logs
      const config = getBetterStackConfig();
      const isProduction = typeof window === 'undefined' && process.env.NODE_ENV === 'production';
      if (isProduction && typeof obj === 'object' && obj?.critical && config.enabled) {
        const serializedMsg = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        void sendToBetterStack({ level: 'info', msg: serializedMsg, ...(typeof obj === 'object' ? obj : {}) });
      }
      return result;
    }
  };
}

/**
 * Test BetterStack connection
 */
export async function testBetterStackConnection() {
  const config = getBetterStackConfig();
  if (!config.enabled) {
    return { success: false, message: 'BetterStack not configured' };
  }

  try {
    await sendToBetterStack({
      level: 'info',
      msg: 'BetterStack connection test',
      test: true,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Successfully sent test log to BetterStack' };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to connect to BetterStack: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
