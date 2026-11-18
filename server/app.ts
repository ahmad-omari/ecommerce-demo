import express, { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { resolve } from 'node:path';
import { db } from './db';
import { auth } from './auth';
import { catalog } from './catalog';
import { shop } from './shop';
import { uploads } from './photos';
import { HttpError } from './http';

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
  } catch {
    res.status(503).json({ status: 'database unavailable' });
  }
});
app.use('/api/photos/seed',express.static(resolve('public/seed')));
app.use('/api/photos',express.static(uploads));
app.use('/api/auth',auth);
app.use('/api',catalog,shop);
app.use('/api',(_req,res) => { res.status(404).json({ message: 'Endpoint not found.' }); });

const errors: ErrorRequestHandler = (error,_req,res,_next) => {
  if (error instanceof HttpError) { res.status(error.status).json({ message: error.message }); return; }
  if (error instanceof multer.MulterError) { res.status(400).json({ message: 'Upload up to six photos, 4 MB each.' }); return; }
  if (error.code === '23505') { res.status(409).json({ message: 'That name is already in use.' }); return; }
  if (error.code === '23503') { res.status(409).json({ message: 'The selected record is unavailable.' }); return; }
  if (error.status === 400 || error.status === 413) { res.status(error.status).json({ message: 'Invalid request body.' }); return; }
  console.error('API request failed', error.code ?? error.name);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
app.use(errors);
