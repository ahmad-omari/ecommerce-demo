import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HttpError } from './http';

export const uploads = resolve(process.env.UPLOAD_DIR || 'server/uploads');
export const receivePhotos = multer({ limits: { fileSize: 4 * 1024 * 1024, files: 6, fields: 12 } }).array('photos', 6);

function extension(file: Express.Multer.File) {
  const data = file.buffer;
  if (file.mimetype === 'image/png' && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (file.mimetype === 'image/jpeg' && data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'jpg';
  if (file.mimetype === 'image/webp' && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new HttpError(400, 'Upload JPEG, PNG, or WebP photos.');
}

export async function removeUploads(keys: string[]) {
  await Promise.allSettled(keys.map(key => unlink(resolve(uploads, key))));
}

export async function saveUploads(files: Express.Multer.File[]) {
  const keys = files.map(file => randomUUID() + '.' + extension(file));
  if (!keys.length) return keys;
  await mkdir(uploads, { recursive: true });
  try {
    for (const [index, key] of keys.entries()) {
      await writeFile(resolve(uploads, key), files[index].buffer, { flag: 'wx' });
    }
    return keys;
  } catch (error) {
    await removeUploads(keys);
    throw error;
  }
}
