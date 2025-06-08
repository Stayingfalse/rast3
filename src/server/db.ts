import { PrismaClient } from "@prisma/client";

import { env } from "~/env";
import { createChildLogger } from "~/utils/logger";

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
    logger.error({
      message: e.message,
      target: e.target
    }, 'Database error occurred');
  });

  prisma.$on('warn', (e) => {
    logger.warn({
      message: e.message,
      target: e.target
    }, 'Database warning');
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
