import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HttpError } from './http';
import { PhotoUpload } from './multipart';

const uploads = resolve(process.env.UPLOAD_DIR || 'server/uploads');
const seedFolder = resolve('public/seed');
const backend = process.env.PHOTO_STORAGE ?? 'local';
const uploadKey = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
const seedKey = /^seed\/[a-z0-9-]+\.(jpg|png|webp)$/i;
const imageTypes: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

if (backend !== 'local' && backend !== 'gcs') throw new Error('PHOTO_STORAGE must be local or gcs.');

const cloud = backend === 'gcs' ? cloudStorage() : undefined;

function cloudStorage() {
  const { GCS_BUCKET, GCS_PREFIX } = process.env;
  if (!GCS_BUCKET || !GCS_PREFIX || !/^(?:[a-zA-Z0-9_-]+\/)+$/.test(GCS_PREFIX)) {
    throw new Error('GCS storage requires GCS_BUCKET and a nonempty GCS_PREFIX ending in /.');
  }
  const bucket = new Storage().bucket(GCS_BUCKET);
  return (key: string) => bucket.file(GCS_PREFIX + key);
}

function extension(file: PhotoUpload) {
  const data = file.buffer;
  if (file.mimetype === 'image/png' && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (file.mimetype === 'image/jpeg' && data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'jpg';
  if (file.mimetype === 'image/webp' && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new HttpError(400, 'Upload JPEG, PNG, or WebP photos.');
}

export async function readPhoto(key: string) {
  const type = (uploadKey.exec(key) ?? seedKey.exec(key))?.[1]?.toLowerCase();
  if (!type) throw new HttpError(404, 'Photo not found.');
  try {
    const [data] = cloud
      ? await cloud(key).download()
      : [await readFile(key.startsWith('seed/') ? resolve(seedFolder, key.slice(5)) : resolve(uploads, key))];
    return { data, contentType: imageTypes[type] };
  } catch (error) {
    const code = (error as {code?: number | string}).code;
    if (code === 404 || code === 'ENOENT') throw new HttpError(404, 'Photo not found.');
    throw error;
  }
}

export async function removeUploads(keys: string[]) {
  await Promise.allSettled(keys.filter(key => uploadKey.test(key)).map(key => cloud
    ? cloud(key).delete({ ignoreNotFound: true })
    : unlink(resolve(uploads, key))));
}

export async function saveUploads(files: PhotoUpload[]) {
  const entries = files.map(file => ({ file, key: randomUUID() + '.' + extension(file) }));
  const saved: string[] = [];
  if (!entries.length) return saved;
  if (!cloud) await mkdir(uploads, { recursive: true });
  try {
    for (const {file,key} of entries) {
      if (cloud) {
        await cloud(key).save(file.buffer, {
          resumable: false,
          contentType: file.mimetype,
          preconditionOpts: { ifGenerationMatch: 0 }
        });
      } else {
        await writeFile(resolve(uploads, key), file.buffer, { flag: 'wx' });
      }
      saved.push(key);
    }
    return saved;
  } catch (error) {
    await removeUploads(saved);
    throw error;
  }
}
