#!/bin/sh
# Container entrypoint. Optionally syncs the Prisma schema before starting the
# Next.js server. Only enable PRISMA_DB_PUSH_ON_START on non-production
# environments (e.g. raosanta-dev); production schema changes stay manual.
set -e

if [ "$PRISMA_DB_PUSH_ON_START" = "true" ]; then
  echo "PRISMA_DB_PUSH_ON_START=true: syncing database schema"
  prisma db push --skip-generate --schema ./prisma/schema.prisma
fi

exec node server.js
