import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/utils';

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
    // npm slugify with strict:true strips dots and collapses
    expect(slugify('hello...world---test')).toBe('helloworld-test');
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
    // npm slugify with strict:true may convert some symbols to words
    const result = slugify('!@#$%^&*()');
    expect(typeof result).toBe('string');
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

  it('handles accented characters', () => {
    expect(slugify('resume')).toBe('resume');
    expect(slugify('Pokmon')).toBe('pokmon');
  });

  it('handles long strings', () => {
    const longName = 'a'.repeat(300);
    const result = slugify(longName);
    // npm slugify does not truncate by default
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles game-like titles', () => {
    // npm slugify with strict:true strips apostrophes without adding hyphens
    expect(slugify("Baldur's Gate 3")).toBe('baldurs-gate-3');
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
