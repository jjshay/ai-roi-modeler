import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function initDatabase(): Promise<void> {
  // Both dev (src/) and prod (dist/) resolve to ../src/schema.sql from __dirname
  const schemaPath = join(__dirname, '..', 'src', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  await sql.unsafe(schema);
  console.log('Database schema initialized');
}
