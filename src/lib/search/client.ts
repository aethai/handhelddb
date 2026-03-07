import { MeiliSearch } from 'meilisearch';

const host =
  import.meta.env.MEILISEARCH_HOST ??
  process.env.MEILISEARCH_HOST ??
  'http://localhost:7700';
const apiKey =
  import.meta.env.MEILISEARCH_API_KEY ??
  process.env.MEILISEARCH_API_KEY ??
  '';

export const searchClient = new MeiliSearch({
  host,
  apiKey,
});
