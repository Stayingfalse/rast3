#!/usr/bin/env node
/**
 * Prints the database's migration state as JSON for docker-entrypoint.sh:
 *   { tables, hasHistory, baselineApplied, foreign: [names...] }
 *
 * tables          - user tables in the database (excluding _prisma_migrations)
 * hasHistory      - whether the _prisma_migrations table exists
 * baselineApplied - whether 0_init is recorded as applied
 * foreign         - history rows that aren't migrations in prisma/migrations
 *                   (e.g. left behind by older tooling)
 */
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

async function main() {
  const local = new Set(
    fs
      .readdirSync(path.join(__dirname, "prisma", "migrations"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  /**
   * @template T
   * @param {import("mysql2/promise").Connection} conn
   * @param {string} sql
   * @returns {Promise<T[]>}
   */
  const select = async (conn, sql) => /** @type {T[]} */ ((await conn.query(sql))[0]);

  const conn = await mysql.createConnection(url);
  try {
    /** @type {{ tables: number }[]} */
    const [tableCount] = await select(
      conn,
      `SELECT COUNT(*) AS tables FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
         AND table_name <> '_prisma_migrations'`,
    );
    /** @type {{ hasHistory: number }[]} */
    const [historyCount] = await select(
      conn,
      `SELECT COUNT(*) AS hasHistory FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'`,
    );
    const tables = Number(tableCount?.tables ?? 0);
    const hasHistory = Number(historyCount?.hasHistory ?? 0) > 0;

    /** @type {{ migration_name: string, finished_at: Date | null, rolled_back_at: Date | null }[]} */
    let rows = [];
    if (hasHistory) {
      rows = await select(
        conn,
        "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations",
      );
    }
    console.log(
      JSON.stringify({
        tables,
        hasHistory,
        baselineApplied: rows.some(
          (r) => r.migration_name === "0_init" && r.finished_at && !r.rolled_back_at,
        ),
        foreign: rows.map((r) => r.migration_name).filter((n) => !local.has(n)),
      }),
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`[migration-state] ${err.message}`);
  process.exit(1);
});
