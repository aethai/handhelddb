import { useState, useEffect, useRef, useCallback } from 'react';

interface GameHit {
  id: number;
  name: string;
  slug: string;
  header_image?: string;
  capsule_image?: string;
  genres?: string[];
  developers?: string[];
  deck_compatibility?: string;
  metacritic_score?: number;
}

interface SearchResponse {
  hits: GameHit[];
  query: string;
  processingTimeMs?: number;
  estimatedTotalHits?: number;
}

interface SearchBarProps {
  /** Show the full-width hero variant */
  variant?: 'hero' | 'header';
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 200;

const deckBadge: Record<string, { label: string; class: string }> = {
  verified: { label: 'Verified', class: 'bg-[#D4A574]/20 text-[#D4A574] border-[#D4A574]/30' },
  playable: { label: 'Playable', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  unsupported: { label: 'Unsupported', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  unknown: { label: 'Unknown', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function SearchBar({
  variant = 'hero',
  placeholder = 'Search games... (e.g. Elden Ring, Cyberpunk 2077)',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      // Cancel previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const data: SearchResponse = await res.json();
        setResults(data.hits);
        setIsOpen(data.hits.length > 0);
        setSelectedIndex(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setResults([]);
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const hit = results[selectedIndex];
        window.location.href = `/games/${hit.slug}`;
      }
    },
    [isOpen, results, selectedIndex],
  );

  const isHero = variant === 'hero';

  return (
    <div ref={containerRef} className={`relative ${isHero ? 'w-full' : ''}`}>
      <div className={`relative ${isHero ? 'group' : ''}`}>
        {isHero && (
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4A574]/20 to-[#DAA520]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
        )}
        <div className="relative flex items-center">
          <svg
            className={`absolute ${isHero ? 'left-5 h-5 w-5' : 'left-3 h-4 w-4'} text-gray-500`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={
              isHero
                ? 'w-full rounded-xl border border-[#44403C] bg-[#1C1917]/90 py-4 pl-14 pr-32 text-white placeholder-gray-500 focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574] transition-all'
                : 'w-64 rounded-lg border border-[#44403C] bg-[#1C1917]/90 py-1.5 pl-9 pr-16 text-sm text-white placeholder-gray-500 focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574] transition-all'
            }
          />

          <div className={`absolute ${isHero ? 'right-3' : 'right-2'} flex items-center gap-2`}>
            {isLoading && (
              <svg className="h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <kbd
              className={`hidden sm:inline-flex items-center rounded-md border border-[#44403C] bg-[#292524] px-2 py-0.5 text-xs text-gray-500`}
            >
              Ctrl+K
            </kbd>
            {isHero && (
              <a
                href="/games"
                className="rounded-lg bg-[#C9956B] px-4 py-2 text-sm font-medium text-white hover:bg-[#D4A574] transition-colors"
              >
                Browse
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-xl border border-[#44403C] bg-[#1C1917] shadow-2xl shadow-black/50 overflow-hidden ${isHero ? '' : 'min-w-80'}`}
        >
          <ul className="max-h-96 overflow-y-auto divide-y divide-[#292524]">
            {results.map((hit, i) => {
              const badge = deckBadge[hit.deck_compatibility ?? 'unknown'];
              return (
                <li key={hit.id}>
                  <a
                    href={`/games/${hit.slug}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[#292524]/80 transition-colors ${
                      i === selectedIndex ? 'bg-[#292524]/80' : ''
                    }`}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {(hit.capsule_image || hit.header_image) && (
                      <img
                        src={hit.capsule_image || hit.header_image}
                        alt=""
                        className="h-10 w-[72px] rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{hit.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {hit.genres && hit.genres.length > 0 && (
                          <span className="text-xs text-gray-500 truncate">
                            {hit.genres.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {badge && (
                          <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badge.class}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {hit.metacritic_score && (
                      <span
                        className={`flex-shrink-0 text-xs font-bold rounded px-1.5 py-0.5 ${
                          hit.metacritic_score >= 75
                            ? 'bg-[#D4A574]/20 text-[#D4A574]'
                            : hit.metacritic_score >= 50
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {hit.metacritic_score}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[#292524] px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <a href={`/games?q=${encodeURIComponent(query)}`} className="text-xs text-[#D4A574] hover:text-[#E8C5A0]">
              View all results →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
