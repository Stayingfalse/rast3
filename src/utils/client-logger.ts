// Client-side logging utilities for browser environment
'use client';

import React from 'react';

/**
 * Client-side logger for browser environments
 * Provides structured logging with automatic error reporting
 */

export type ClientLogData = Record<string, unknown>;

export interface ClientErrorData extends ClientLogData {
  userAgent?: string;
  url?: string;
  timestamp?: string;
  userId?: string;
}

interface PerformanceData extends ClientLogData {
  metric: string;
  value: number;
  url?: string;
  timestamp?: string;
}

class ClientLogger {
  private isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private apiEndpoint = '/api/logs'; // Future endpoint for log collection

  /**
   * Log client-side errors with context
   */
  error(error: Error | string, context?: string, data?: ClientErrorData): void {
    const errorData: ClientErrorData = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (this.isDevelopment) {
      console.error('[CLIENT ERROR]', errorData);
    }    // In production, we would send this to a logging service
    void this.sendToServer('error', errorData);
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, value: number, data?: PerformanceData): void {
    const perfData: PerformanceData = {
      metric,
      value,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (this.isDevelopment) {
      console.log('[CLIENT PERFORMANCE]', perfData);
    }

    void this.sendToServer('performance', perfData);
  }

  /**
   * Log user interactions
   */
  interaction(action: string, element?: string, data?: ClientLogData): void {
    const interactionData = {
      action,
      element,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (this.isDevelopment) {
      console.log('[CLIENT INTERACTION]', interactionData);
    }

    void this.sendToServer('interaction', interactionData);
  }

  /**
   * Log page views
   */
  pageView(path: string, data?: ClientLogData): void {
    const pageData = {
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (this.isDevelopment) {
      console.log('[CLIENT PAGE VIEW]', pageData);
    }

    void this.sendToServer('page_view', pageData);
  }
  /**
   * Send logs to server (placeholder for future implementation)
   */
  private async sendToServer(_type: string, _data: ClientLogData): Promise<void> {
    // In development, we skip sending to server
    if (this.isDevelopment) return;

    try {
      // Future implementation: send to logging endpoint
      // await fetch(this.apiEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type, data })
      // });
    } catch (error) {
      // Silently fail to avoid logging loops
      if (this.isDevelopment) {
        console.warn('Failed to send log to server:', error);
      }
    }
  }
}

// Create singleton instance
export const clientLogger = new ClientLogger();

/**
 * Hook for React components to use client logging
 */
export function useClientLogger() {
  return {
    logError: clientLogger.error.bind(clientLogger),
    logPerformance: clientLogger.performance.bind(clientLogger),
    logInteraction: clientLogger.interaction.bind(clientLogger),
    logPageView: clientLogger.pageView.bind(clientLogger)
  };
}

/**
 * Higher-order component for automatic error boundary logging
 */
export function withErrorLogging<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ErrorLoggedComponent(props: P) {
    if (typeof window !== 'undefined') {
      // Set up global error handler
      window.addEventListener('error', (event) => {
        const error = event.error instanceof Error ? event.error : new Error(String(event.message));
        clientLogger.error(error, 'global_error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Set up unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        clientLogger.error(error, 'unhandled_promise_rejection');
      });
    }

    return React.createElement(Component, props);
  };
}

/**
 * Performance monitoring utilities
 */
export const performance = {
  /**
   * Mark the start of a performance measurement
   */
  markStart(name: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`);
    }
  },

  /**
   * Mark the end of a performance measurement and log the duration
   */
  markEnd(name: string, data?: PerformanceData): void {
    if (typeof window !== 'undefined' && window.performance) {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;
      
      window.performance.mark(endMark);
      
      try {
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name, 'measure')[0];
        
        if (measure) {
          clientLogger.performance(name, measure.duration, data);
        }
        
        // Clean up marks
        window.performance.clearMarks(startMark);
        window.performance.clearMarks(endMark);
        window.performance.clearMeasures(name);      } catch {
        // Ignore performance API errors
      }
    }
  },

  /**
   * Log Core Web Vitals and other important metrics
   */
  logWebVitals(): void {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // This would require installing web-vitals package
      // For now, we'll use basic performance API
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            clientLogger.performance('page_load', navigation.loadEventEnd - navigation.fetchStart);
            clientLogger.performance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
            clientLogger.performance('first_byte', navigation.responseStart - navigation.fetchStart);
          }
        }, 0);
      });
    }
  }
};

// Auto-initialize performance monitoring
if (typeof window !== 'undefined') {
  performance.logWebVitals();
}
