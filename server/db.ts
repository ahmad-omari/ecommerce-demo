import 'dotenv/config';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';

let pool: Promise<Pool> | undefined;

async function createPool() {
  const config: PoolConfig = { max: 5, connectionTimeoutMillis: 5000 };
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  if (instanceConnectionName) {
    const { PGDATABASE, PGUSER, PGPASSWORD } = process.env;
    if (!PGDATABASE || !PGUSER || !PGPASSWORD) {
      throw new Error('Cloud SQL requires PGDATABASE, PGUSER, and PGPASSWORD.');
    }
    const connector = new Connector();
    try {
      const options = await connector.getOptions({ instanceConnectionName, ipType: IpAddressTypes.PRIVATE });
      // The connector supplies a verified TLS socket. Don't negotiate a second TLS layer in pg.
      Object.assign(config, options, { database: PGDATABASE, user: PGUSER, password: PGPASSWORD, ssl: false });
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
