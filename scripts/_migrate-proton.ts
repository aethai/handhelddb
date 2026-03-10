import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  // Use node-pg with explicit connection params (avoids URL-encoding issues)
  const client = new Client({
    host: 'db.zkucqaldekwpgvezgtsi.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'rKger0TLRk!',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL');

  const res = await client.query('ALTER TABLE performance_reports ADD COLUMN IF NOT EXISTS proton_version text');
  console.log('Migration done:', res.command);

  await client.end();
}

main().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
