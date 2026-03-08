import { useState, useEffect, useCallback, useRef } from 'react';

interface GameHit {
  id: string;
  name: string;
  slug: string;
  header_image?: string;
  capsule_image?: string;
  genres?: string[];
  developers?: string[];
  deck_compatibility?: string;
  metacritic_score?: number;
  is_free_to_play?: boolean;
}

interface SearchResponse {
  hits: GameHit[];
  query: string;
  processingTimeMs?: number;
  estimatedTotalHits?: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

interface Props {
  initialGames: GameHit[];
  totalGames: number;
  allGenres: string[];
}

const DECK_BADGES: Record<string, { label: string; class: string }> = {
  verified: { label: 'Verified', class: 'bg-[#D4A574]/20 text-[#D4A574] border-[#D4A574]/30' },
  playable: { label: 'Playable', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  unsupported: { label: 'Unsupported', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  unknown: { label: 'Unknown', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

const SORT_OPTIONS = [
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
  { value: 'metacritic_score:desc', label: 'Metacritic (High)' },
  { value: 'metacritic_score:asc', label: 'Metacritic (Low)' },
  { value: 'release_date:desc', label: 'Newest' },
  { value: 'release_date:asc', label: 'Oldest' },
];

const DECK_FILTERS = [
  { value: 'verified', label: 'Verified' },
  { value: 'playable', label: 'Playable' },
  { value: 'unsupported', label: 'Unsupported' },
];

export default function GamesBrowser({ initialGames, totalGames, allGenres }: Props) {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<GameHit[]>(initialGames);
  const [totalHits, setTotalHits] = useState(totalGames);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('name:asc');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const abortRef = useRef<AbortController | null>(null);

  const hasFilters = query.trim() || selectedGenres.length > 0 || selectedDeck.length > 0 || sort !== 'name:asc';

  const doSearch = useCallback(async () => {
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('limit', '60');
      params.set('sort', sort);
      if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
      if (selectedDeck.length > 0) params.set('deck', selectedDeck.join(','));

      const res = await fetch(`/api/games-search?${params}`, { signal: controller.signal });
      const data: SearchResponse = await res.json();
      setGames(data.hits);
      setTotalHits(data.estimatedTotalHits ?? data.hits.length);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Search failed:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [query, sort, selectedGenres, selectedDeck]);

  // Debounce search
  useEffect(() => {
    if (!hasFilters && games === initialGames) return;
    const timer = setTimeout(doSearch, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, sort, selectedGenres, selectedDeck]);

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const toggleDeck = (d: string) => {
    setSelectedDeck(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const clearFilters = () => {
    setQuery('');
    setSort('name:asc');
    setSelectedGenres([]);
    setSelectedDeck([]);
    setGames(initialGames);
    setTotalHits(totalGames);
  };

  return (
    <div>
      {/* Search + Controls */}
      <div className="mb-6 rounded-xl border border-[#292524] bg-[#1C1917] p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-lg border border-[#44403C] bg-[#292524] py-2.5 pl-12 pr-4 text-white placeholder-gray-500 focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-lg border border-[#44403C] bg-[#292524] px-3 py-2.5 text-sm text-gray-300 focus:border-[#D4A574] focus:outline-none"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-lg border px-3 py-2.5 text-sm transition-colors flex items-center gap-1.5 ${
              showFilters || selectedGenres.length > 0 || selectedDeck.length > 0
                ? 'border-[#D4A574] bg-[#D4A574]/10 text-[#D4A574]'
                : 'border-[#44403C] bg-[#292524] text-gray-300 hover:border-[#57534E]'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {(selectedGenres.length + selectedDeck.length) > 0 && (
              <span className="rounded-full bg-[#C9956B] px-1.5 text-[10px] font-bold text-white">
                {selectedGenres.length + selectedDeck.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 space-y-4 border-t border-[#292524] pt-4">
            {/* Deck Compatibility */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deck Compatibility</p>
              <div className="flex flex-wrap gap-2">
                {DECK_FILTERS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => toggleDeck(d.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedDeck.includes(d.value)
                        ? 'border-[#D4A574] bg-[#D4A574]/10 text-[#D4A574]'
                        : 'border-[#44403C] text-gray-400 hover:border-[#57534E] hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Genres</p>
              <div className="flex flex-wrap gap-2">
                {allGenres.map(g => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedGenres.includes(g)
                        ? 'border-[#D4A574] bg-[#D4A574]/10 text-[#D4A574]'
                        : 'border-[#44403C] text-gray-400 hover:border-[#57534E] hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count + View toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? 'Searching...' : `${totalHits} game${totalHits !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-[#292524] p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#292524] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            title="Grid view"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#292524] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            title="List view"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Game Grid / List */}
      {games.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {games.map(game => (
              <a
                key={game.id}
                href={`/games/${game.slug}`}
                className="group relative rounded-lg border border-[#292524] bg-[#1C1917] overflow-hidden hover:border-[#44403C] transition-colors"
              >
                <div className="relative aspect-[460/300]">
                  {game.header_image ? (
                    <img
                      src={game.header_image}
                      alt={game.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#292524] to-[#1C1917]" />
                  )}
                  {/* Overlay with game info at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{game.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      {game.genres?.slice(0, 1).map(g => (
                        <span key={g} className="text-[10px] text-stone-400">{g}</span>
                      ))}
                      {game.metacritic_score && (
                        <span className={`ml-auto text-[10px] font-bold ${
                          game.metacritic_score >= 75 ? 'text-green-400' : game.metacritic_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {game.metacritic_score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="rounded-xl border border-[#292524] bg-[#1C1917] divide-y divide-[#292524]">
            {games.map(game => (
              <a
                key={game.id}
                href={`/games/${game.slug}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-[#292524]/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-9 rounded overflow-hidden flex-shrink-0 bg-[#292524]">
                  {game.header_image && (
                    <img src={game.header_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                {/* Name */}
                <span className="text-sm text-white font-medium truncate flex-1 min-w-0">{game.name}</span>
                {/* Genres */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  {game.genres?.slice(0, 2).map(g => (
                    <span key={g} className="text-[10px] text-stone-500">{g}</span>
                  ))}
                </div>
                {/* Deck badge */}
                {game.deck_compatibility && DECK_BADGES[game.deck_compatibility] && (
                  <span className={`hidden md:inline rounded-full border px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${DECK_BADGES[game.deck_compatibility].class}`}>
                    {DECK_BADGES[game.deck_compatibility].label}
                  </span>
                )}
                {/* Metacritic */}
                {game.metacritic_score ? (
                  <span className={`text-xs font-bold flex-shrink-0 w-8 text-right ${
                    game.metacritic_score >= 75 ? 'text-green-400' : game.metacritic_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {game.metacritic_score}
                  </span>
                ) : (
                  <span className="w-8 flex-shrink-0" />
                )}
              </a>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-[#292524] bg-[#1C1917] p-8 text-center">
          <p className="text-gray-500">No games found matching your criteria.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm text-[#D4A574] hover:text-[#E8C5A0]">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
