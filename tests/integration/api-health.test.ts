import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://127.0.0.1:4321';

async function fetchJson(path: string, options?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  return {
    status: response.status,
    headers: response.headers,
    body: response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text(),
  };
}

describe('Integration (requires running server)', () => {
  describe('Public pages', () => {
    it('GET / returns 200', async () => {
      const response = await fetch(`${BASE_URL}/`);
      expect(response.status).toBe(200);
    });

    it('GET /games returns 200', async () => {
      const response = await fetch(`${BASE_URL}/games`);
      expect(response.status).toBe(200);
    });

    it('GET /news returns 200', async () => {
      const response = await fetch(`${BASE_URL}/news`);
      expect(response.status).toBe(200);
    });

    it('GET /auth/login returns 200', async () => {
      const response = await fetch(`${BASE_URL}/auth/login`);
      expect(response.status).toBe(200);
    });
  });

  describe('API endpoints', () => {
    it('GET /api/devices-list returns 200 with devices', async () => {
      const { status, body } = await fetchJson('/api/devices-list');
      expect(status).toBe(200);
      expect(body).toHaveProperty('devices');
      expect(Array.isArray(body.devices)).toBe(true);
    });

    it('GET /api/comments?gameId=valid-format returns JSON', async () => {
      const { status } = await fetchJson('/api/comments?gameId=00000000-0000-0000-0000-000000000000');
      // Should return 200 with empty results or a valid JSON response
      expect(status).toBeLessThan(500);
    });

    it('GET /api/notifications returns 401 without auth', async () => {
      const { status } = await fetchJson('/api/notifications');
      expect(status).toBe(401);
    });
  });

  describe('Auth API endpoints', () => {
    it('POST /api/auth/login with missing fields returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(status).toBe(400);
      expect(body.error).toBeDefined();
    });

    it('POST /api/auth/login with missing password returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      expect(status).toBe(400);
      expect(body.error).toContain('required');
    });

    it('POST /api/auth/register with missing fields returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(status).toBe(400);
      expect(body.error).toBeDefined();
    });

    it('POST /api/auth/register with invalid email returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'validpassword123' }),
      });
      expect(status).toBe(400);
      expect(body.error).toContain('email');
    });

    it('POST /api/auth/register with short password returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'short' }),
      });
      expect(status).toBe(400);
      expect(body.error).toContain('8 characters');
    });

    it('POST /api/auth/register with too-long password returns 400', async () => {
      const { status, body } = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'a'.repeat(129),
        }),
      });
      expect(status).toBe(400);
      expect(body.error).toContain('too long');
    });
  });

  describe('Security headers', () => {
    it('API responses include security headers', async () => {
      const response = await fetch(`${BASE_URL}/api/devices-list`);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
    });
  });
});
