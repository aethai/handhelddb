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
  verified: { label: 'Verified', class: 'text-[#22c55e]' },
  playable: { label: 'Playable', class: 'text-[#eab308]' },
  unsupported: { label: 'Unsupported', class: 'text-[#ef4444]' },
  unknown: { label: 'Unknown', class: 'text-[var(--color-text-dim)]' },
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
      <div className="relative flex items-center">
        <svg
          className={`absolute ${isHero ? 'left-5 h-5 w-5' : 'left-3 h-4 w-4'} text-[var(--color-text-dim)]`}
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
              ? 'w-full border border-[var(--color-border)] bg-[var(--color-raised)] py-4 pl-14 pr-36 text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:border-[#D4FF00] focus:outline-none focus:ring-1 focus:ring-[#D4FF00] transition-colors'
              : 'w-64 border border-[var(--color-border)] bg-[var(--color-raised)] py-1.5 pl-9 pr-16 text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:border-[#D4FF00] focus:outline-none focus:ring-1 focus:ring-[#D4FF00] transition-colors'
          }
        />

        <div className={`absolute ${isHero ? 'right-3' : 'right-2'} flex items-center gap-2`}>
          {isLoading && (
            <svg className="h-4 w-4 animate-spin text-[var(--color-text-dim)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <kbd
            className="hidden sm:inline-flex items-center border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-dim)] font-[var(--font-mono)]"
            title="Press / or Ctrl+K to search"
          >
            /
          </kbd>
          {isHero && (
            <a
              href="/games"
              className="bg-[#D4FF00] px-5 py-2 text-xs font-bold text-[#0a0a0a] uppercase tracking-[0.06em] font-[var(--font-mono)] hover:bg-[#e8ff4d] transition-colors"
            >
              Browse
            </a>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full border border-[var(--color-border)] bg-[var(--color-raised)] shadow-lg overflow-hidden ${isHero ? '' : 'min-w-80'}`}
        >
          <ul className="max-h-96 overflow-y-auto">
            {results.map((hit, i) => {
              const badge = deckBadge[hit.deck_compatibility ?? 'unknown'];
              return (
                <li key={hit.id}>
                  <a
                    href={`/games/${hit.slug}`}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-elevated)] transition-colors ${
                      i === selectedIndex ? 'bg-[var(--color-elevated)]' : ''
                    }`}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {(hit.capsule_image || hit.header_image) && (
                      <img
                        src={hit.capsule_image || hit.header_image}
                        alt=""
                        className="h-10 w-[72px] object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{hit.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {hit.genres && hit.genres.length > 0 && (
                          <span className="text-xs text-[var(--color-text-dim)] truncate">
                            {hit.genres.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {badge && (
                          <span
                            className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${badge.class}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    {hit.metacritic_score && (
                      <span
                        className={`flex-shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 ${
                          hit.metacritic_score >= 75
                            ? 'text-[#22c55e]'
                            : hit.metacritic_score >= 50
                              ? 'text-[#eab308]'
                              : 'text-[#ef4444]'
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
          <div className="border-t border-[var(--color-border)] px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-dim)] font-mono">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <a href={`/games?q=${encodeURIComponent(query)}`} className="text-xs text-[var(--color-text-3)] hover:text-[#D4FF00] font-mono uppercase tracking-wide transition-colors">
              View all &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
