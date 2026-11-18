const redacted = '[REDACTED]';

function decode(value: string) {
  try { return decodeURIComponent(value); }
  catch { return value; }
}

function secretValues() {
  const { DATABASE_URL, PGPASSWORD } = process.env;
  let urlPassword = '';
  let queryPassword: string | null = null;
  try {
    if (DATABASE_URL?.trim()) {
      const url = new URL(DATABASE_URL.trim());
      urlPassword = url.password;
      queryPassword = url.searchParams.getAll('password').at(-1) ?? null;
    }
  } catch {
    // The complete value is still redacted if URL parsing fails.
  }

  const values = new Set<string>();
  for (const value of [DATABASE_URL?.trim(), PGPASSWORD, urlPassword, queryPassword]) {
    if (!value) continue;
    const decoded = decode(value);
    for (const variant of [value, decoded, encodeURIComponent(decoded), JSON.stringify(decoded).slice(1, -1)]) {
      values.add(variant);
    }
  }
  return [...values].sort((a, b) => b.length - a.length).map(value => {
    const literal = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(literal.replace(/%([\da-f])([\da-f])/gi, (_escape, a: string, b: string) =>
      '%' + [a, b].map(char => /[a-f]/i.test(char) ? '[' + char.toLowerCase() + char.toUpperCase() + ']' : char).join('')), 'g');
  });
}

function errorFields(error: unknown, sanitize: (value: unknown) => string | null, depth = 0): object {
  const entry = error && typeof error === 'object'
    ? error as { name?: unknown; code?: unknown; message?: unknown; cause?: unknown; errors?: unknown }
    : undefined;
  return {
    name: sanitize(entry?.name) ?? 'Error',
    code: sanitize(entry?.code),
    message: sanitize(entry ? entry.message : error) ?? 'No error message available.',
    ...(depth < 3 && entry?.cause != null ? { cause: errorFields(entry.cause, sanitize, depth + 1) } : {}),
    ...(depth < 3 && Array.isArray(entry?.errors) ? {
      errors: entry.errors.slice(0, 3).map(child => errorFields(child, sanitize, depth + 1))
    } : {})
  };
}

export function logError(stage: string, error: unknown) {
  const secrets = secretValues();
  const sanitize = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    let message = String(value);
    if (/\b(?:authorization|cookies?|set-cookie|(?:access[_ -]?|refresh[_ -]?)?token|password|pgpassword|database_url|request[ _-]?body|connection[ _-]?config(?:uration)?|process\.env)["']?\s*[:=]|\bBearer\s+\S/i.test(message)) {
      return redacted;
    }
    for (const secret of secrets) {
      message = message.replace(secret, redacted);
    }
    // Remove PostgreSQL URLs even when they differ from the configured URI.
    message = message.replace(/\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi, redacted);
    return message.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000);
  };

  console.error(JSON.stringify({ severity: 'ERROR', stage, ...errorFields(error, sanitize) }));
}
