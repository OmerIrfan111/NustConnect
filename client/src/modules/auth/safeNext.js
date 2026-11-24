/** Only same-site paths are allowed as a post-login target (blocks open redirects like //evil.com or https://evil.com). */
export function safeNext(value, fallback = '/dashboard') {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
