import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
export let databaseReady = false;
export let databaseInitError: string | null = null;

function missingDatabaseUrl(): never {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql: postgres.Sql = databaseUrl
  ? postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : (missingDatabaseUrl as unknown as postgres.Sql);

export async function initDatabase(): Promise<void> {
  if (!databaseUrl) {
    databaseInitError = 'DATABASE_URL environment variable is required';
    console.error(databaseInitError);
    return;
  }

  try {
    // Both dev (src/) and prod (dist/) resolve to ../src/schema.sql from __dirname
    const schemaPath = join(__dirname, '..', 'src', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    await sql.unsafe(schema);
    databaseReady = true;
    databaseInitError = null;
    console.log('Database schema initialized');
  } catch (error) {
    databaseReady = false;
    databaseInitError = error instanceof Error ? error.message : String(error);
    console.error('Database initialization failed:', error);
  }
}
