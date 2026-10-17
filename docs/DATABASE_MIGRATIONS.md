# Database migrations

The schema is managed with versioned Prisma migrations in `prisma/migrations/`.
`0_init` is the baseline: the schema as it stood when migrations were adopted
(October 2026). Before that, changes were applied by hand with `prisma db push`.

## How environments apply them

`docker-entrypoint.sh` reads `PRISMA_SCHEMA_SYNC` on container start:

| Value | Behaviour | Used by |
|---|---|---|
| *(unset)* | Nothing. The schema is managed by hand. | prod, until switched over |
| `migrate` | `prisma migrate deploy`. A database whose tables pre-date migrations (no history table, or an empty one) is baselined first (`0_init` marked as applied) **only if** its tables exactly match `schema.prisma`; otherwise it is left untouched and reported as `drift`. Unrecognised history rows are left alone and reported as `foreign-history`. A failed migration stops the container from starting. | dev |
| `push` | `prisma db push` (no history). Throwaway databases only. | — |

The result (`skipped`, `pushed`, `migrated`, `baselined`, `drift`,
`foreign-history`, `failed`) and the migration history are shown by
`GET /api/health`. `migration-state.cjs` is the helper the entrypoint uses to
inspect the database before deciding what to do.

## Making a schema change

1. Edit `prisma/schema.prisma`.
2. Start a scratch MariaDB and create the migration against it:

   ```bash
   docker run -d --name ras-mig -e MARIADB_ROOT_PASSWORD=pw -p 3307:3306 mariadb:11
   DATABASE_URL="mysql://root:pw@127.0.0.1:3307/ras_mig" \
     npx prisma migrate dev --create-only --name describe_the_change
   ```

   This replays the existing migrations, then writes
   `prisma/migrations/<timestamp>_describe_the_change/migration.sql`.
3. Read the SQL. Anything that drops or rewrites data needs a plan
   (backfill, two-step rename, etc.) before it reaches prod.
4. Commit the schema change and the migration together. Merging to `dev`
   deploys it to dev, where it runs automatically; prod runs it on the next
   deploy once prod uses `PRISMA_SCHEMA_SYNC=migrate`.

Never edit a migration that has already been applied anywhere; add a new one.
