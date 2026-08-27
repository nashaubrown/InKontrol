// In-memory login rate limiter (per-process). Sufficient for a single-instance
// deployment; swap for Redis/Upstash before scaling horizontally.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map<string, { count: number; firstAt: number }>();

function key(email: string) {
  return email.trim().toLowerCase();
}

export function checkLoginRateLimit(email: string): boolean {
  const entry = failures.get(key(email));
  if (!entry) return true;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    failures.delete(key(email));
    return true;
  }
  return entry.count < MAX_FAILURES;
}

export function recordLoginFailure(email: string) {
  const k = key(email);
  const entry = failures.get(k);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    failures.set(k, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(email: string) {
  failures.delete(key(email));
}
