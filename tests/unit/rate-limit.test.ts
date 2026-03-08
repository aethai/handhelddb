import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, RATE_LIMITS, API_RATE_LIMITS } from '@/lib/api/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows the first request', () => {
      const result = checkRateLimit('test-first-request', { requests: 60, windowMs: 60000 });
      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBe(0);
    });

    it('allows requests up to the limit', () => {
      const config = { requests: 5, windowMs: 60000 };
      const key = 'test-up-to-limit';

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests exceeding the limit', () => {
      const config = { requests: 3, windowMs: 60000 };
      const key = 'test-exceed-limit';

      // Use up all allowed requests
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, config);
      }

      // The 4th request should be blocked
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('allows exactly the limit number of requests', () => {
      const config = { requests: 60, windowMs: 60000 };
      const key = 'test-exactly-limit';

      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }

      // The 61st should be blocked
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
    });

    it('resets after the window expires', () => {
      const config = { requests: 2, windowMs: 60000 };
      const key = 'test-window-reset';

      // Use up the limit
      checkRateLimit(key, config);
      checkRateLimit(key, config);

      // Should be blocked
      expect(checkRateLimit(key, config).allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    });

    it('returns retryAfterMs within the window duration', () => {
      const config = { requests: 1, windowMs: 30000 };
      const key = 'test-retry-after';

      checkRateLimit(key, config);

      // Advance 10 seconds
      vi.advanceTimersByTime(10000);

      const result = checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeLessThanOrEqual(30000);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('uses separate counters for different keys', () => {
      const config = { requests: 1, windowMs: 60000 };

      // First key uses its limit
      checkRateLimit('key-a', config);
      expect(checkRateLimit('key-a', config).allowed).toBe(false);

      // Second key should still be allowed
      expect(checkRateLimit('key-b', config).allowed).toBe(true);
    });

    it('handles rapid successive requests correctly', () => {
      const config = { requests: 10, windowMs: 1000 };
      const key = 'test-rapid';

      // All 10 should pass
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(key, config).allowed).toBe(true);
      }

      // 11th should fail
      expect(checkRateLimit(key, config).allowed).toBe(false);
    });
  });

  describe('RATE_LIMITS config', () => {
    it('defines steam rate limit', () => {
      expect(RATE_LIMITS.steam).toBeDefined();
      expect(RATE_LIMITS.steam.requests).toBe(200);
      expect(RATE_LIMITS.steam.windowMs).toBe(5 * 60 * 1000);
    });

    it('defines steamspy rate limit', () => {
      expect(RATE_LIMITS.steamspy).toBeDefined();
      expect(RATE_LIMITS.steamspy.requests).toBe(1);
      expect(RATE_LIMITS.steamspy.windowMs).toBe(1000);
    });

    it('defines igdb rate limit', () => {
      expect(RATE_LIMITS.igdb).toBeDefined();
      expect(RATE_LIMITS.igdb.requests).toBe(4);
      expect(RATE_LIMITS.igdb.windowMs).toBe(1000);
    });

    it('defines protondb rate limit', () => {
      expect(RATE_LIMITS.protondb).toBeDefined();
      expect(RATE_LIMITS.protondb.requests).toBe(10);
      expect(RATE_LIMITS.protondb.windowMs).toBe(1000);
    });
  });

  describe('API_RATE_LIMITS config', () => {
    it('defines rate limit for POST /api/reports', () => {
      expect(API_RATE_LIMITS['POST /api/reports']).toBeDefined();
      expect(API_RATE_LIMITS['POST /api/reports'].requests).toBe(10);
      expect(API_RATE_LIMITS['POST /api/reports'].windowMs).toBe(60 * 60 * 1000);
    });

    it('defines rate limit for POST /api/comments', () => {
      expect(API_RATE_LIMITS['POST /api/comments']).toBeDefined();
      expect(API_RATE_LIMITS['POST /api/comments'].requests).toBe(10);
    });

    it('defines rate limit for GET /api/search', () => {
      expect(API_RATE_LIMITS['GET /api/search']).toBeDefined();
      expect(API_RATE_LIMITS['GET /api/search'].requests).toBe(30);
      expect(API_RATE_LIMITS['GET /api/search'].windowMs).toBe(60 * 1000);
    });

    it('defines rate limit for POST /api/*/vote', () => {
      expect(API_RATE_LIMITS['POST /api/*/vote']).toBeDefined();
      expect(API_RATE_LIMITS['POST /api/*/vote'].requests).toBe(60);
    });
  });
});
