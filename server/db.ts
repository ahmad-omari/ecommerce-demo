import 'dotenv/config';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { parse } from 'pg-connection-string';
import { logError } from './error-log';

let pool: Promise<Pool> | undefined;

function cloudCredentials() {
  const { PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  let database = PGDATABASE;
  let user = PGUSER;
  let password = PGPASSWORD;

  if (databaseUrl && (!database || !user || !password)) {
    try {
      const url = new URL(databaseUrl);
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

function directConfig(databaseUrl: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(databaseUrl);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URI.');
  }

  // Normalize the mode in memory and require encryption for every direct connection.
  const sslMode = url.searchParams.getAll('sslmode').at(-1) ?? 'verify-full';
  if (!['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    throw new Error('Direct PostgreSQL requires sslmode=require, verify-ca, or verify-full.');
  }
  url.searchParams.set('sslmode', sslMode);
  url.searchParams.delete('uselibpqcompat');
  if (sslMode === 'verify-ca' && !url.searchParams.get('sslrootcert')) {
    throw new Error('sslmode=verify-ca requires a CA file configured with sslrootcert.');
  }

  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(url.href, { useLibpqCompat: true });
  } catch {
    throw new Error('Could not parse DATABASE_URL or read its TLS files.');
  }

  const { host, ssl } = parsed;
  const portText = parsed.port || '5432';
  const port = Number(portText);
  if (!host || host.startsWith('/') || !/^\d+$/.test(portText) || port < 1 || port > 65535) {
    throw new Error('Direct PostgreSQL requires a TCP host and a valid port in DATABASE_URL.');
  }
  if (!ssl || typeof ssl !== 'object') {
    throw new Error('Direct PostgreSQL requires TLS.');
  }
  return {
    host,
    port,
    database: process.env.PGDATABASE || parsed.database || undefined,
    user: process.env.PGUSER || parsed.user,
    password: process.env.PGPASSWORD || parsed.password,
    ssl: { ...ssl, cert: ssl.cert ?? undefined, rejectUnauthorized: ssl.rejectUnauthorized !== false }
  };
}

async function createPool() {
  const config: PoolConfig = { max: 5, connectionTimeoutMillis: 5000 };
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (instanceConnectionName) {
    let connector: Connector | undefined;
    try {
      const credentials = cloudCredentials();
      connector = new Connector();
      const options = await connector.getOptions({ instanceConnectionName, ipType: IpAddressTypes.PRIVATE });
      // The connector supplies a verified TLS socket. Don't negotiate a second TLS layer in pg.
      Object.assign(config, options, credentials, { ssl: false });
    } catch (error) {
      logError('cloud-sql.connector.initialize', error);
      connector?.close();
      throw error;
    }
  } else if (databaseUrl !== undefined) {
    try {
      Object.assign(config, directConfig(databaseUrl));
    } catch (error) {
      logError('database.direct.configure', error);
      throw error;
    }
  }
  const connectionPool = new Pool(config);
  connectionPool.on('error', error => logError('database.pool.idle', error));
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
