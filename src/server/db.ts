import { PrismaClient } from "@prisma/client";

import { env } from "~/env";
import { loggers } from "~/utils/logger";

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
    loggers.database.debug('Database query executed', {
      query: e.query,
      params: e.params,
      duration: e.duration,
      target: e.target
    });
  });

  prisma.$on('error', (e) => {
    loggers.database.error('Database error occurred', {
      message: e.message,
      target: e.target
    });
  });

  prisma.$on('warn', (e) => {
    loggers.database.warn('Database warning', {
      message: e.message,
      target: e.target
    });
  });

  prisma.$on('info', (e) => {
    loggers.database.info('Database info', {
      message: e.message,
      target: e.target
    });
  });

  return prisma;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
