#!/bin/sh
# Container entrypoint: optionally syncs the database schema, then starts the
# Next.js server. Controlled by PRISMA_SCHEMA_SYNC:
#
#   (unset)  do nothing (production default until migrations are enabled)
#   push     prisma db push - throwaway/dev databases only
#   migrate  prisma migrate deploy. On a database created before migrations
#            existed (no _prisma_migrations table), the 0_init baseline is
#            marked as applied first - but only if the live schema exactly
#            matches prisma/schema.prisma. Otherwise nothing is changed and
#            the drift is reported.
#
# PRISMA_DB_PUSH_ON_START=true is still accepted as an alias for "push".
# The outcome is written to $STATUS_FILE and shown by /api/health.
set -e

SCHEMA=./prisma/schema.prisma
STATUS_FILE=/tmp/schema-sync.json
BASELINE=0_init

mode="${PRISMA_SCHEMA_SYNC:-}"
if [ -z "$mode" ] && [ "$PRISMA_DB_PUSH_ON_START" = "true" ]; then
  mode=push
fi

write_status() {
  printf '{"mode":"%s","result":"%s","at":"%s"}\n' \
    "${mode:-none}" "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS_FILE"
}

case "$mode" in
  "")
    write_status "skipped"
    ;;
  push)
    echo "[schema-sync] prisma db push"
    prisma db push --skip-generate --schema "$SCHEMA"
    write_status "pushed"
    ;;
  migrate)
    echo "[schema-sync] prisma migrate deploy"
    if out=$(prisma migrate deploy --schema "$SCHEMA" 2>&1); then
      echo "$out"
      write_status "migrated"
    elif echo "$out" | grep -q "P3005"; then
      # Existing database without migration history: baseline it if safe.
      echo "[schema-sync] no migration history; checking for drift before baselining"
      if prisma migrate diff --from-url "$DATABASE_URL" \
          --to-schema-datamodel "$SCHEMA" --exit-code >/dev/null 2>&1; then
        prisma migrate resolve --applied "$BASELINE" --schema "$SCHEMA"
        prisma migrate deploy --schema "$SCHEMA"
        write_status "baselined"
      else
        echo "[schema-sync] DRIFT: database differs from the schema; not migrating. Differences:"
        prisma migrate diff --from-url "$DATABASE_URL" \
          --to-schema-datamodel "$SCHEMA" --script || true
        write_status "drift"
      fi
    else
      echo "$out"
      write_status "failed"
      echo "[schema-sync] migrate deploy failed; refusing to start" >&2
      exit 1
    fi
    ;;
  *)
    echo "[schema-sync] unknown PRISMA_SCHEMA_SYNC=$mode" >&2
    write_status "unknown-mode"
    ;;
esac

exec node server.js
