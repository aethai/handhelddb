interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export const RATE_LIMITS = {
  steam: { requests: 200, windowMs: 5 * 60 * 1000 },
  steamspy: { requests: 1, windowMs: 1000 },
  igdb: { requests: 4, windowMs: 1000 },
  protondb: { requests: 10, windowMs: 1000 },
} satisfies Record<string, RateLimitConfig>;

export const API_RATE_LIMITS = {
  'POST /api/reports': { requests: 10, windowMs: 60 * 60 * 1000 },
  'POST /api/comments': { requests: 10, windowMs: 60 * 60 * 1000 },
  'POST /api/*/vote': { requests: 60, windowMs: 60 * 60 * 1000 },
  'POST /api/*/flag': { requests: 10, windowMs: 60 * 60 * 1000 },
  'GET /api/search': { requests: 30, windowMs: 60 * 1000 },
  'POST /api/user/library': { requests: 1, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitConfig>;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count < config.requests) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

export async function withRateLimit<T>(
  key: string,
  config: RateLimitConfig,
  fn: () => Promise<T>,
): Promise<T> {
  const { allowed, retryAfterMs } = checkRateLimit(key, config);

  if (!allowed) {
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    return withRateLimit(key, config, fn);
  }

  return fn();
}
