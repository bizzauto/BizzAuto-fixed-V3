import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️ Sentry DSN not configured - skipping monitoring setup');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `bizzauto@${process.env.npm_package_version || '1.0.0'}`,

    // Performance monitoring
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    // Sampling rates
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter events
    beforeSend(event, hint) {
      // Don't send certain errors in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },

    // Additional context
    initialScope: {
      tags: {
        app: 'bizzauto-crm',
        environment: process.env.NODE_ENV || 'development',
      },
    },
  });

  console.log('✅ Sentry monitoring initialized');
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    (Sentry.captureMessage as any)(message, level, {
      extra: context,
    });
  }
}

export function setUserContext(userId: string, email: string, additionalData?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    email,
    ...additionalData,
  });
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}