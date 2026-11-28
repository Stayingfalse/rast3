import { PrismaClient } from "@prisma/client";

import { env } from "~/env";
import { createChildLogger } from "~/utils/logger";
import { isWriteConflict } from "~/server/utils/write-conflict";

const logger = createChildLogger('server');

const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: env.NODE_ENV === "development" ? 
      [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'info' }
      ] : 
      [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ],
  });

  // Set up event listeners for structured logging
  prisma.$on('query', (e) => {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: e.duration,
      target: e.target
    }, 'Database query executed');
  });

  prisma.$on('error', (e) => {
    // two requests refreshing the same row at once: harmless (21 Nov)
    // a sign-in link used twice (24 Nov): the adapter treats it as "no
    // token" and Auth.js shows /auth/error; nothing for us to fix
    if (e.target === 'verificationToken.delete' && e.message.includes('No record was found')) {
      logger.warn({ target: e.target, errorType: 'used_sign_in_link' }, 'Sign-in link already used');
      return;
    }
    // an email already sent (28 Nov): the email log's once-only claim
    // (sendOnce) refuses it on purpose and the sender skips it
    if (e.target === 'emailLog.create' && e.message.includes('EmailLog_userId_kind_season_ref_key')) {
      logger.info({ target: e.target, errorType: 'email_already_sent' }, 'Email already sent (once-only claim)');
      return;
    }
        if (isWriteConflict(e.message)) {
      logger.warn({ target: e.target, errorType: 'write_conflict' }, 'Database write conflict (harmless race)');
      return;
    }
    logger.error({
      message: e.message,
      target: e.target,
      timestamp: new Date().toISOString(),
      errorType: 'database_error',
      actionNeeded: 'Check database connection and query syntax'
    }, `Database error in ${e.target}: ${e.message}`);
  });

  prisma.$on('warn', (e) => {
    logger.warn({
      message: e.message,
      target: e.target,
      timestamp: new Date().toISOString(),
      warningType: 'database_warning',
      actionSuggested: 'Review query performance or schema issues'
    }, `Database warning from ${e.target}: ${e.message}`);
  });

  prisma.$on('info', (e) => {
    logger.info({
      message: e.message,
      target: e.target
    }, 'Database info');
  });

  return prisma;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
