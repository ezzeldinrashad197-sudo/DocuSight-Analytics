import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigrate() {
  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
  const adminDb = drizzle(pool);
  try {
    console.log("Running migrations with admin...");
    await migrate(adminDb, { migrationsFolder: './drizzle' });
    console.log("Migrations complete.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigrate().catch(console.error);
