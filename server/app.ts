import express, { ErrorRequestHandler } from 'express';
import { db } from './db';
import { auth } from './auth';
import { catalog } from './catalog';
import { shop } from './shop';
import { readPhoto } from './photos';
import { HttpError } from './http';
import { logError } from './error-log';

export const app = express();
app.disable('x-powered-by');
app.use('/api', (_req,res,next) => {
  res.set('X-Content-Type-Options','nosniff');
  res.set('Cache-Control','no-store');
  next();
});
app.use(express.json());
app.get('/api/health', async (_req,res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    logError('database.health', error);
    res.status(503).json({ status: 'database unavailable' });
  }
});
app.get('/api/photos/*key', async (req,res) => {
  const { key } = req.params;
  const photo = await readPhoto(Array.isArray(key) ? key.join('/') : key);
  res.type(photo.contentType).send(photo.data);
});
app.use('/api/auth',auth);
app.use('/api',catalog,shop);
app.use('/api',(_req,res) => { res.status(404).json({ message: 'Endpoint not found.' }); });

const errors: ErrorRequestHandler = (error,_req,res,_next) => {
  if (error instanceof HttpError) { res.status(error.status).json({ message: error.message }); return; }
  if (error.code === '23505') { res.status(409).json({ message: 'That name is already in use.' }); return; }
  if (error.code === '23503') { res.status(409).json({ message: 'The selected record is unavailable.' }); return; }
  if (error.status === 400 || error.status === 413) { res.status(error.status).json({ message: 'Invalid request body.' }); return; }
  logError('api.unexpected', error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
app.use(errors);
