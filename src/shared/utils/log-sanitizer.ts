const SENSITIVE_FIELDS = new Set([
  'password',
  'authorization',
  'accessToken',
  'refreshToken',
  'idToken',
]);

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : sanitizeForLog(nestedValue);
    }
    return sanitized;
  }

  return value;
}
