import { describe, it, expect } from 'vitest';
import { slugify, formatDate, formatNumber, clamp, truncate } from '@/lib/utils';

describe('slugify (library-based)', () => {
  it('converts a basic string to a slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles special characters', () => {
    const result = slugify('Hello, World!');
    expect(result).not.toContain(',');
    expect(result).not.toContain('!');
  });

  it('handles game titles', () => {
    expect(slugify('DOOM Eternal')).toBe('doom-eternal');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = formatDate(date);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-06-01');
    expect(result).toContain('Jun');
    expect(result).toContain('2024');
  });

  it('accepts ISO date strings', () => {
    const result = formatDate('2024-12-25T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('Dec');
  });
});

describe('formatNumber', () => {
  it('returns small numbers as-is', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to minimum when below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to maximum when above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('works with negative ranges', () => {
    expect(clamp(-3, -5, -1)).toBe(-3);
    expect(clamp(-10, -5, -1)).toBe(-5);
    expect(clamp(0, -5, -1)).toBe(-1);
  });

  it('works with floating point numbers', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('returns the string unchanged when exactly at maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('handles strings shorter than 3 characters with small maxLength', () => {
    // Edge case: maxLength of 3 means we get 0 chars + '...'
    expect(truncate('hello', 3)).toBe('...');
  });

  it('handles empty strings', () => {
    expect(truncate('', 10)).toBe('');
  });
});
