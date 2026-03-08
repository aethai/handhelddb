import { defineMiddleware } from 'astro:middleware';
import { getUser } from '@lib/auth/supabase';

// ─── Rate limiting (in-memory, per-IP) ───
interface RateEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT = 60;          // max requests per window
const RATE_WINDOW_MS = 60_000;  // 1 minute window
const CLEANUP_INTERVAL_MS = 5 * 60_000; // clean stale entries every 5 minutes

const rateLimitMap = new Map<string, RateEntry>();
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getRateLimitHeaders(ip: string): Record<string, string> {
  const entry = rateLimitMap.get(ip);
  if (!entry) return {};
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  const reset = Math.ceil((entry.resetAt - Date.now()) / 1000);
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.max(0, reset)),
  };
}

// ─── Security headers applied to all responses ───
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const onRequest = defineMiddleware(async ({ cookies, locals, request, url }, next) => {
  // ── Periodic cleanup of stale rate-limit entries ──
  cleanupStaleEntries();

  // ── Rate limiting for API routes ──
  const isApiRoute = url.pathname.startsWith('/api/');

  if (isApiRoute) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';

    if (isRateLimited(ip)) {
      const retryHeaders = getRateLimitHeaders(ip);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...retryHeaders,
            ...SECURITY_HEADERS,
          },
        },
      );
    }
  }

  // ── Auth: resolve user from cookies ──
  const user = await getUser(cookies);
  locals.user = user;

  // ── Continue to route handler ──
  const response = await next();

  // ── Apply security headers to all responses ──
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  // ── Append rate-limit headers for API routes ──
  if (isApiRoute) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
    const rlHeaders = getRateLimitHeaders(ip);
    for (const [header, value] of Object.entries(rlHeaders)) {
      response.headers.set(header, value);
    }
  }

  return response;
});
