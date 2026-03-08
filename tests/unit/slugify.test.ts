import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/utils/slugify';

describe('slugify', () => {
  it('converts a basic string to a slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('converts uppercase to lowercase', () => {
    expect(slugify('ALL CAPS TEXT')).toBe('all-caps-text');
  });

  it('replaces special characters with hyphens', () => {
    expect(slugify('Hello, World! How are you?')).toBe('hello-world-how-are-you');
  });

  it('replaces multiple consecutive special characters with a single hyphen', () => {
    expect(slugify('hello...world---test')).toBe('hello-world-test');
  });

  it('removes leading hyphens', () => {
    expect(slugify('---hello')).toBe('hello');
  });

  it('removes trailing hyphens', () => {
    expect(slugify('hello---')).toBe('hello');
  });

  it('removes both leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('handles strings with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });

  it('handles empty strings', () => {
    expect(slugify('')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Game 2024 Edition')).toBe('game-2024-edition');
  });

  it('handles mixed alphanumeric and special characters', () => {
    expect(slugify('Half-Life 2: Episode One')).toBe('half-life-2-episode-one');
  });

  it('handles unicode characters by removing them', () => {
    expect(slugify('Cafe Uber Nino')).toBe('cafe-uber-nino');
  });

  it('handles accented characters by removing them', () => {
    // Accented chars are not a-z0-9, so they get replaced with hyphens
    expect(slugify('resume')).toBe('resume');
    // Single non-ASCII char between letters gets stripped, collapsing them
    expect(slugify('Pokmon')).toBe('pokmon');
  });

  it('truncates to 250 characters maximum', () => {
    const longName = 'a'.repeat(300);
    const result = slugify(longName);
    expect(result.length).toBeLessThanOrEqual(250);
    expect(result).toBe('a'.repeat(250));
  });

  it('truncates long strings with hyphens correctly', () => {
    // Generate a string that will produce a slug longer than 250 chars
    const longName = Array.from({ length: 130 }, (_, i) => `word${i}`).join(' ');
    const result = slugify(longName);
    expect(result.length).toBeLessThanOrEqual(250);
  });

  it('handles game-like titles', () => {
    expect(slugify("Baldur's Gate 3")).toBe('baldur-s-gate-3');
    expect(slugify('The Elder Scrolls V: Skyrim')).toBe('the-elder-scrolls-v-skyrim');
    expect(slugify('Grand Theft Auto V')).toBe('grand-theft-auto-v');
    expect(slugify('DOOM Eternal')).toBe('doom-eternal');
  });

  it('handles device names with parentheses and commas', () => {
    expect(slugify('Steam Deck (LCD)')).toBe('steam-deck-lcd');
    expect(slugify('ROG Ally X, 2024 Edition')).toBe('rog-ally-x-2024-edition');
  });

  it('handles strings with tabs and newlines', () => {
    expect(slugify('hello\tworld\ntest')).toBe('hello-world-test');
  });

  it('handles single character input', () => {
    expect(slugify('a')).toBe('a');
    expect(slugify('A')).toBe('a');
    expect(slugify('1')).toBe('1');
  });
});
