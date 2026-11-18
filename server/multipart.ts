import busboy from 'busboy';
import { Readable } from 'node:stream';
import { Request, RequestHandler } from 'express';
import { HttpError } from './http';

export interface PhotoUpload {
  buffer: Buffer;
  mimetype: string;
}

type UploadRequest = Request & { rawBody?: Buffer; photos?: PhotoUpload[] };
const fileSize = 4 * 1024 * 1024;
const maxFiles = 6;
const maxFields = 12;

export const receivePhotos: RequestHandler = (req: UploadRequest, _res, next) => {
  if (!req.is('multipart/form-data')) { next(); return; }

  const fields: Record<string, string | string[]> = Object.create(null);
  const photos: PhotoUpload[] = [];
  const invalid = () => new HttpError(400, 'Invalid multipart form data.');
  const limit = () => new HttpError(400, 'Upload up to six photos, 4 MB each, with valid listing fields.');
  let error: HttpError | undefined;
  let parser: ReturnType<typeof busboy>;
  try {
    parser = busboy({ headers: req.headers, limits: { fileSize: fileSize + 1, files: maxFiles, fields: maxFields } });
  } catch {
    next(invalid());
    return;
  }

  parser.on('field', (name, value, info) => {
    if (info.nameTruncated || info.valueTruncated) { error ??= limit(); return; }
    const existing = fields[name];
    fields[name] = existing === undefined ? value : ([] as string[]).concat(existing, value);
  });
  parser.on('file', (name, file, info) => {
    if (name !== 'photos') {
      error ??= invalid();
      file.resume();
      return;
    }
    const photo = { buffer: Buffer.alloc(0), mimetype: info.mimeType };
    photos.push(photo);
    const chunks: Buffer[] = [];
    file.on('data', (chunk: Buffer) => chunks.push(chunk));
    file.on('limit', () => { error ??= limit(); });
    file.on('error', () => { error ??= invalid(); });
    file.on('end', () => { photo.buffer = Buffer.concat(chunks); });
  });
  parser.on('filesLimit', () => { error ??= limit(); });
  parser.on('fieldsLimit', () => { error ??= limit(); });
  parser.on('error', () => { error ??= invalid(); });

  const source = Buffer.isBuffer(req.rawBody) ? Readable.from([req.rawBody]) : req;
  const abort = () => parser.destroy(invalid());
  source.once('error', abort);
  req.once('aborted', abort);
  parser.once('close', () => {
    source.removeListener('error', abort);
    req.removeListener('aborted', abort);
    if (error) { next(error); return; }
    req.body = fields;
    req.photos = photos;
    next();
  });
  source.pipe(parser);
};

export function uploadedPhotos(req: UploadRequest) {
  return req.photos ?? [];
}
