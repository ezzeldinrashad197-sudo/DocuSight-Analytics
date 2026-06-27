import { createPool } from './src/db/index';

const pool = createPool();

async function check() {
  console.log('SQL_HOST is:', process.env.SQL_HOST);
console.log('SQL_USER is:', process.env.SQL_USER);
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log(res.rows);
  } finally {
    await pool.end();
  }
}

check().catch(console.error);
