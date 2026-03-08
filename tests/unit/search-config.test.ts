import { describe, it, expect } from 'vitest';
import {
  GAMES_INDEX,
  NEWS_INDEX,
  GAMES_INDEX_CONFIG,
  NEWS_INDEX_CONFIG,
} from '@/lib/search/config';

describe('Search Config', () => {
  describe('Index names', () => {
    it('exports GAMES_INDEX as "games"', () => {
      expect(GAMES_INDEX).toBe('games');
    });

    it('exports NEWS_INDEX as "news"', () => {
      expect(NEWS_INDEX).toBe('news');
    });
  });

  describe('GAMES_INDEX_CONFIG', () => {
    it('has primaryKey set to "id"', () => {
      expect(GAMES_INDEX_CONFIG.primaryKey).toBe('id');
    });

    it('has searchableAttributes defined', () => {
      expect(GAMES_INDEX_CONFIG.searchableAttributes).toBeDefined();
      expect(Array.isArray(GAMES_INDEX_CONFIG.searchableAttributes)).toBe(true);
      expect(GAMES_INDEX_CONFIG.searchableAttributes.length).toBeGreaterThan(0);
    });

    it('includes name in searchableAttributes', () => {
      expect(GAMES_INDEX_CONFIG.searchableAttributes).toContain('name');
    });

    it('includes developers in searchableAttributes', () => {
      expect(GAMES_INDEX_CONFIG.searchableAttributes).toContain('developers');
    });

    it('includes genres in searchableAttributes', () => {
      expect(GAMES_INDEX_CONFIG.searchableAttributes).toContain('genres');
    });

    it('includes tags in searchableAttributes', () => {
      expect(GAMES_INDEX_CONFIG.searchableAttributes).toContain('tags');
    });

    it('has filterableAttributes defined', () => {
      expect(GAMES_INDEX_CONFIG.filterableAttributes).toBeDefined();
      expect(Array.isArray(GAMES_INDEX_CONFIG.filterableAttributes)).toBe(true);
      expect(GAMES_INDEX_CONFIG.filterableAttributes.length).toBeGreaterThan(0);
    });

    it('includes key filterable attributes for game search', () => {
      const expected = [
        'genres',
        'tags',
        'deckCompatibility',
        'protondbTier',
        'releaseYear',
        'priceUsd',
        'isFreeToPlay',
      ];
      for (const attr of expected) {
        expect(GAMES_INDEX_CONFIG.filterableAttributes).toContain(attr);
      }
    });

    it('has sortableAttributes defined', () => {
      expect(GAMES_INDEX_CONFIG.sortableAttributes).toBeDefined();
      expect(Array.isArray(GAMES_INDEX_CONFIG.sortableAttributes)).toBe(true);
    });

    it('includes key sortable attributes', () => {
      expect(GAMES_INDEX_CONFIG.sortableAttributes).toContain('name');
      expect(GAMES_INDEX_CONFIG.sortableAttributes).toContain('releaseDate');
      expect(GAMES_INDEX_CONFIG.sortableAttributes).toContain('metacriticScore');
    });

    it('has rankingRules defined', () => {
      expect(GAMES_INDEX_CONFIG.rankingRules).toBeDefined();
      expect(Array.isArray(GAMES_INDEX_CONFIG.rankingRules)).toBe(true);
      expect(GAMES_INDEX_CONFIG.rankingRules.length).toBeGreaterThan(0);
    });

    it('starts ranking rules with "words"', () => {
      expect(GAMES_INDEX_CONFIG.rankingRules[0]).toBe('words');
    });

    it('includes "typo" in ranking rules', () => {
      expect(GAMES_INDEX_CONFIG.rankingRules).toContain('typo');
    });

    it('has typo tolerance enabled', () => {
      expect(GAMES_INDEX_CONFIG.typoTolerance).toBeDefined();
      expect(GAMES_INDEX_CONFIG.typoTolerance.enabled).toBe(true);
    });

    it('configures typo tolerance thresholds', () => {
      expect(GAMES_INDEX_CONFIG.typoTolerance.minWordSizeForTypos.oneTypo).toBe(4);
      expect(GAMES_INDEX_CONFIG.typoTolerance.minWordSizeForTypos.twoTypos).toBe(8);
    });

    it('has faceting config', () => {
      expect(GAMES_INDEX_CONFIG.faceting).toBeDefined();
      expect(GAMES_INDEX_CONFIG.faceting.maxValuesPerFacet).toBe(100);
    });

    it('has pagination config', () => {
      expect(GAMES_INDEX_CONFIG.pagination).toBeDefined();
      expect(GAMES_INDEX_CONFIG.pagination.maxTotalHits).toBe(5000);
    });
  });

  describe('NEWS_INDEX_CONFIG', () => {
    it('has primaryKey set to "id"', () => {
      expect(NEWS_INDEX_CONFIG.primaryKey).toBe('id');
    });

    it('has searchableAttributes defined', () => {
      expect(NEWS_INDEX_CONFIG.searchableAttributes).toBeDefined();
      expect(Array.isArray(NEWS_INDEX_CONFIG.searchableAttributes)).toBe(true);
    });

    it('includes title in searchableAttributes', () => {
      expect(NEWS_INDEX_CONFIG.searchableAttributes).toContain('title');
    });

    it('includes body in searchableAttributes', () => {
      expect(NEWS_INDEX_CONFIG.searchableAttributes).toContain('body');
    });

    it('includes tags in searchableAttributes', () => {
      expect(NEWS_INDEX_CONFIG.searchableAttributes).toContain('tags');
    });

    it('has filterableAttributes defined', () => {
      expect(NEWS_INDEX_CONFIG.filterableAttributes).toBeDefined();
      expect(Array.isArray(NEWS_INDEX_CONFIG.filterableAttributes)).toBe(true);
    });

    it('includes category in filterableAttributes', () => {
      expect(NEWS_INDEX_CONFIG.filterableAttributes).toContain('category');
    });

    it('includes devices in filterableAttributes', () => {
      expect(NEWS_INDEX_CONFIG.filterableAttributes).toContain('devices');
    });

    it('has sortableAttributes defined', () => {
      expect(NEWS_INDEX_CONFIG.sortableAttributes).toBeDefined();
      expect(NEWS_INDEX_CONFIG.sortableAttributes).toContain('publishedAt');
      expect(NEWS_INDEX_CONFIG.sortableAttributes).toContain('viewCount');
    });
  });
});
