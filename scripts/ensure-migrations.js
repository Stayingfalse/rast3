#!/usr/bin/env node
/**
 * ensure-migrations.js
 *
 * Run on server startup (or deploy step). Checks if the `archived` column
 * exists on the wishlists table. If missing, runs `prisma migrate deploy`
 * to apply pending migrations, then writes a marker file so we don't check
 * on every start.
 */
const fs = require('fs');
const { exec } = require('child_process');
const mysql = require('mysql2/promise');

const MARKER_DIR = '.migration-markers';
const MARKER_FILE = `${MARKER_DIR}/add-archived-to-wishlist_assignment.done`;

async function main() {
  try {
    if (fs.existsSync(MARKER_FILE)) {
      console.log('Migration marker present — skipping migration check.');
      return process.exit(0);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL is not set — cannot check DB schema.');
      return process.exit(1);
    }

    // Connect using mysql2; it accepts a connection string.
    const conn = await mysql.createConnection(dbUrl);

    // Look for the `archived` column on likely table names. Prisma model -> table
    // names can vary; check common variants.
    const tableCandidates = [
      'WishlistAssignment',
      'wishlist_assignment',
      'wishlistassignment',
      'WISHLISTASSIGNMENT',
    ];

    let columnFound = false;
    for (const tbl of tableCandidates) {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'archived'`,
        [tbl],
      );
      const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
      if (cnt > 0) {
        columnFound = true;
        break;
      }
    }

    await conn.end();

    if (columnFound) {
      console.log('Column `archived` already exists. Creating marker and exiting.');
      fs.mkdirSync(MARKER_DIR, { recursive: true });
      fs.writeFileSync(MARKER_FILE, `applied:${new Date().toISOString()}\n`);
      return process.exit(0);
    }

    console.log('Column `archived` not found. Running prisma migrate deploy...');

    // Run prisma migrate deploy synchronously and stream output
    const child = exec('npx prisma migrate deploy', { env: process.env });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on('exit', (code) => {
      if (code === 0) {
        fs.mkdirSync(MARKER_DIR, { recursive: true });
        fs.writeFileSync(MARKER_FILE, `applied:${new Date().toISOString()}\n`);
        console.log('Migrations deployed and marker written.');
        process.exit(0);
      } else {
        console.error('prisma migrate deploy exited with code', code);
        process.exit(code || 1);
      }
    });
  } catch (err) {
    console.error('Error while ensuring migrations:', err);
    process.exit(1);
  }
}

main();
