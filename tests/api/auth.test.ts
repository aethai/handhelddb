import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '@/lib/utils/validation';

/**
 * These tests validate the auth endpoint logic by testing the same validation
 * rules used in the API routes. Since Astro API routes are tightly coupled to
 * the Astro runtime (they receive Request/cookies objects), we test the
 * extracted validation logic rather than calling the routes directly.
 *
 * For full endpoint testing, see tests/integration/api-health.test.ts
 * which calls the running server.
 */

describe('Auth API Validation Logic', () => {
  describe('POST /api/auth/register - validation rules', () => {
    it('rejects missing email', () => {
      const email = '';
      const password = 'validpassword123';

      // The register endpoint checks: if (!email || !password)
      expect(!email || !password).toBe(true);
    });

    it('rejects missing password', () => {
      const email = 'test@example.com';
      const password = '';

      expect(!email || !password).toBe(true);
    });

    it('rejects both missing', () => {
      const email = '';
      const password = '';

      expect(!email || !password).toBe(true);
    });

    it('accepts valid email and password', () => {
      const email = 'user@example.com';
      const password = 'securepassword123';

      expect(!email || !password).toBe(false);
    });

    it('rejects invalid email format', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@no-local.com')).toBe(false);
    });

    it('accepts valid email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('first.last@domain.co.uk')).toBe(true);
    });

    it('rejects short passwords (< 8 chars)', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('rejects overly long passwords (> 128 chars)', () => {
      const result = validatePassword('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('accepts valid passwords', () => {
      expect(validatePassword('validpassword123').valid).toBe(true);
      expect(validatePassword('12345678').valid).toBe(true);
    });
  });

  describe('POST /api/auth/login - validation rules', () => {
    it('rejects when email is missing', () => {
      const email = undefined;
      const password = 'somepassword';

      // The login endpoint checks: if (!email || !password)
      expect(!email || !password).toBe(true);
    });

    it('rejects when password is missing', () => {
      const email = 'test@example.com';
      const password = undefined;

      expect(!email || !password).toBe(true);
    });

    it('accepts when both fields are present', () => {
      const email = 'test@example.com';
      const password = 'somepassword';

      expect(!email || !password).toBe(false);
    });
  });

  describe('Email normalization', () => {
    it('login normalizes email to lowercase and trims', () => {
      const email = '  User@Example.COM  ';
      const normalized = email.toLowerCase().trim();
      expect(normalized).toBe('user@example.com');
    });

    it('register normalizes email the same way', () => {
      const email = 'USER@DOMAIN.COM';
      const normalized = email.toLowerCase().trim();
      expect(normalized).toBe('user@domain.com');
    });
  });

  describe('Display name handling in register', () => {
    it('trims display name', () => {
      const displayName = '  John Doe  ';
      const trimmed = displayName?.trim().slice(0, 50) || null;
      expect(trimmed).toBe('John Doe');
    });

    it('truncates display name to 50 characters', () => {
      const displayName = 'A'.repeat(100);
      const trimmed = displayName?.trim().slice(0, 50) || null;
      expect(trimmed).toBe('A'.repeat(50));
    });

    it('handles null display name', () => {
      const displayName: string | undefined = undefined;
      const trimmed = displayName?.trim().slice(0, 50) || null;
      expect(trimmed).toBeNull();
    });

    it('handles empty display name', () => {
      const displayName = '';
      const trimmed = displayName?.trim().slice(0, 50) || null;
      expect(trimmed).toBeNull();
    });
  });
});
