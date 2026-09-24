import { Pool, PoolConfig } from 'pg';

const config: PoolConfig = {
  host: process.env.BANK_DB_HOST || 'localhost',
  port: parseInt(process.env.BANK_DB_PORT || '5432'),
  user: process.env.BANK_DB_USER || 'bank_admin',
  password: process.env.BANK_DB_PASSWORD || 'bank_pass_123',
  database: process.env.BANK_DB_NAME || 'bank_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'test') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  return result;
}

export async function getClient() {
  return pool.connect();
}

export async function closePool() {
  await pool.end();
}