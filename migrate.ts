import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, createPool } from './src/db/index.js'; // Ensure correct import

async function runMigrate() {
  const pool = createPool();
  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log("Migrations complete.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigrate().catch(console.error);
