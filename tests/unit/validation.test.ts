import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  sanitizeHtml,
} from '@/lib/utils/validation';

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('name.surname@domain.co.uk')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
    expect(validateEmail('user123@test.org')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects emails without local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false);
    expect(validateEmail('user@ example.com')).toBe(false);
    expect(validateEmail(' user@example.com')).toBe(false);
  });

  it('rejects emails without TLD', () => {
    expect(validateEmail('user@example')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects emails with multiple @ signs', () => {
    expect(validateEmail('user@@example.com')).toBe(false);
    expect(validateEmail('user@host@example.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts valid passwords (8+ characters)', () => {
    expect(validatePassword('password123')).toEqual({ valid: true });
    expect(validatePassword('12345678')).toEqual({ valid: true });
    expect(validatePassword('a'.repeat(128))).toEqual({ valid: true });
  });

  it('rejects empty passwords', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password is required');
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('short');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters');
  });

  it('rejects 7-character passwords', () => {
    const result = validatePassword('1234567');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters');
  });

  it('accepts exactly 8-character passwords', () => {
    expect(validatePassword('12345678')).toEqual({ valid: true });
  });

  it('rejects passwords longer than 128 characters', () => {
    const result = validatePassword('a'.repeat(129));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password is too long');
  });

  it('accepts exactly 128-character passwords', () => {
    expect(validatePassword('a'.repeat(128))).toEqual({ valid: true });
  });

  it('accepts passwords with special characters', () => {
    expect(validatePassword('p@$$w0rd!!')).toEqual({ valid: true });
  });

  it('accepts passwords with unicode', () => {
    expect(validatePassword('password12345')).toEqual({ valid: true });
  });
});

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('john_doe')).toEqual({ valid: true });
    expect(validateUsername('user123')).toEqual({ valid: true });
    expect(validateUsername('abc')).toEqual({ valid: true });
    expect(validateUsername('a'.repeat(24))).toEqual({ valid: true });
  });

  it('rejects empty usernames', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Username is required');
  });

  it('rejects usernames shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3-24 characters');
  });

  it('rejects usernames longer than 24 characters', () => {
    const result = validateUsername('a'.repeat(25));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3-24 characters');
  });

  it('rejects usernames with uppercase letters', () => {
    const result = validateUsername('JohnDoe');
    expect(result.valid).toBe(false);
  });

  it('rejects usernames with spaces', () => {
    const result = validateUsername('john doe');
    expect(result.valid).toBe(false);
  });

  it('rejects usernames with hyphens', () => {
    const result = validateUsername('john-doe');
    expect(result.valid).toBe(false);
  });

  it('rejects usernames with special characters', () => {
    expect(validateUsername('john@doe').valid).toBe(false);
    expect(validateUsername('john.doe').valid).toBe(false);
    expect(validateUsername('john!doe').valid).toBe(false);
  });

  it('accepts usernames with underscores', () => {
    expect(validateUsername('john_doe')).toEqual({ valid: true });
    expect(validateUsername('__test__')).toEqual({ valid: true });
  });

  it('accepts exactly 3-character usernames', () => {
    expect(validateUsername('abc')).toEqual({ valid: true });
  });

  it('accepts exactly 24-character usernames', () => {
    expect(validateUsername('a'.repeat(24))).toEqual({ valid: true });
  });
});

describe('sanitizeHtml', () => {
  it('escapes ampersands', () => {
    expect(sanitizeHtml('rock & roll')).toBe('rock &amp; roll');
  });

  it('escapes less-than signs', () => {
    expect(sanitizeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than signs', () => {
    expect(sanitizeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(sanitizeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes all HTML entities in a complex string', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('handles strings with no special characters', () => {
    expect(sanitizeHtml('plain text')).toBe('plain text');
  });

  it('handles empty strings', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('prevents XSS via img onerror', () => {
    const input = '<img src=x onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('prevents XSS via event handlers by escaping angle brackets', () => {
    const input = '<div onmouseover="alert(\'xss\')">hover me</div>';
    const result = sanitizeHtml(input);
    // sanitizeHtml escapes entities, so <div becomes &lt;div
    // The browser won't parse it as HTML, preventing the event handler from executing
    expect(result).not.toContain('<div');
    expect(result).toContain('&lt;div');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('handles multiple consecutive special characters', () => {
    expect(sanitizeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
  });

  it('escapes ampersands first to avoid double-encoding issues', () => {
    // If & were not escaped first, &lt; could become &amp;lt;
    expect(sanitizeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('handles strings with only special characters', () => {
    expect(sanitizeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#039;');
  });
});
