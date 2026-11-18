import { createHash, randomBytes } from 'node:crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { HttpError, required } from './http';

type User = { id: string; name: string; email: string };
const cookie = 'ah_session';
const options = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.COOKIE_SECURE === 'true', path: '/api' };
const lifetime = 7 * 24 * 60 * 60 * 1000;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function session(req: Request) {
  return req.headers.cookie?.match(/(?:^|;\s*)ah_session=([0-9a-f]{64})(?:;|$)/)?.[1];
}

async function currentUser(req: Request): Promise<User | null> {
  const token = session(req);
  if (!token) return null;
  const result = await db.query<User>(`SELECT u.id, u.name, u.email FROM "AH_sessions" s
    JOIN "AH_users" u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()`, [hash(token)]);
  return result.rows[0] ?? null;
}

export async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  return user;
}

async function login(req: Request, res: Response, user: User) {
  const previous = session(req);
  if (previous) await db.query('DELETE FROM "AH_sessions" WHERE token_hash=$1', [hash(previous)]);
  const token = randomBytes(32).toString('hex');
  await db.query('INSERT INTO "AH_sessions" (token_hash,user_id,expires_at) VALUES ($1,$2,$3)',
    [hash(token), user.id, new Date(Date.now() + lifetime)]);
  res.cookie(cookie, token, { ...options, maxAge: lifetime });
  res.json({ id: user.id, name: user.name, email: user.email });
}

export const auth = Router();
auth.get('/me', async (req, res) => { res.json(await currentUser(req)); });
auth.post('/register', async (req, res) => {
  const name = required(req.body?.name, 'Name');
  const email = required(req.body?.email, 'Email').toLowerCase();
  const password = req.body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email.');
  if (typeof password !== 'string' || !password.trim() || bcrypt.truncates(password)) {
    throw new HttpError(400, 'Enter a password up to 72 bytes.');
  }
  const result = await db.query<User>(`INSERT INTO "AH_users" (name,email,password_hash)
    VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id,name,email`, [name, email, await bcrypt.hash(password, 12)]);
  if (!result.rowCount) throw new HttpError(409, 'That email is already registered.');
  await login(req, res, result.rows[0]);
});
auth.post('/login', async (req, res) => {
  const email = required(req.body?.email, 'Email').toLowerCase();
  const password = req.body?.password;
  const { rows } = await db.query<User & { password_hash: string }>(
    'SELECT id,name,email,password_hash FROM "AH_users" WHERE email=$1', [email]);
  const user = rows[0];
  if (!user || typeof password !== 'string' || bcrypt.truncates(password) || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  await login(req, res, user);
});
auth.post('/logout', async (req, res) => {
  const token = session(req);
  if (token) await db.query('DELETE FROM "AH_sessions" WHERE token_hash=$1', [hash(token)]);
  res.clearCookie(cookie, options).sendStatus(204);
});
