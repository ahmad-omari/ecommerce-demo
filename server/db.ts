import 'dotenv/config';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';

let pool: Promise<Pool> | undefined;

function cloudCredentials() {
  const { DATABASE_URL, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  let database = PGDATABASE;
  let user = PGUSER;
  let password = PGPASSWORD;

  if (DATABASE_URL && (!database || !user || !password)) {
    try {
      const url = new URL(DATABASE_URL);
      if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
        throw new Error();
      }
      database ||= decodeURIComponent(url.pathname.slice(1));
      user ||= decodeURIComponent(url.username);
      password ||= decodeURIComponent(url.password);
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL URI.');
    }
  }

  if (!database || !user || !password) {
    throw new Error('Cloud SQL requires a database name, username, and password from DATABASE_URL or PG* settings.');
  }
  return { database, user, password };
}

async function createPool() {
  const config: PoolConfig = { max: 5, connectionTimeoutMillis: 5000 };
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  if (instanceConnectionName) {
    const credentials = cloudCredentials();
    const connector = new Connector();
    try {
      const options = await connector.getOptions({ instanceConnectionName, ipType: IpAddressTypes.PRIVATE });
      // The connector supplies a verified TLS socket. Don't negotiate a second TLS layer in pg.
      Object.assign(config, options, credentials, { ssl: false });
    } catch (error) {
      connector.close();
      throw error;
    }
  }
  const connectionPool = new Pool(config);
  connectionPool.on('error', error => console.error('Idle database connection failed', error.name));
  return connectionPool;
}

function getPool() {
  pool ??= createPool().catch(error => {
    pool = undefined;
    throw error;
  });
  return pool;
}

export const db = {
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) {
    return (await getPool()).query<T>(sql, params);
  }
};

export async function transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await (await getPool()).connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
