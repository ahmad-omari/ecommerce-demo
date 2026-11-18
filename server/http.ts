export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function required(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, label + ' is required.');
  return value.trim();
}

export function id(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'Invalid record ID.');
  }
  return value;
}

export function quantity(value: unknown, minimum: number) {
  const parsed = Number(required(String(value ?? ''), 'Quantity'));
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > 2147483647) {
    throw new HttpError(400, 'Enter a valid quantity.');
  }
  return parsed;
}
