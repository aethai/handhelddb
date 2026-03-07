export const GAMES_INDEX = 'games';
export const NEWS_INDEX = 'news';

export const GAMES_INDEX_CONFIG = {
  primaryKey: 'id',

  searchableAttributes: ['name', 'developers', 'publishers', 'genres', 'tags'],

  filterableAttributes: [
    'genres',
    'tags',
    'deckCompatibility',
    'protondbTier',
    'releaseYear',
    'priceUsd',
    'isFreeToPlay',
    'hasReports',
    'performanceTier',
    'metacriticScore',
  ],

  sortableAttributes: [
    'name',
    'releaseDate',
    'metacriticScore',
    'steamReviewScore',
    'reportCount',
    'priceUsd',
  ],

  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],

  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },

  faceting: {
    maxValuesPerFacet: 100,
  },

  pagination: {
    maxTotalHits: 5000,
  },
};

export const NEWS_INDEX_CONFIG = {
  primaryKey: 'id',
  searchableAttributes: ['title', 'lead', 'body', 'tags'],
  filterableAttributes: [
    'category',
    'devices',
    'relatedGameSlugs',
    'publishedYear',
  ],
  sortableAttributes: ['publishedAt', 'viewCount'],
};
