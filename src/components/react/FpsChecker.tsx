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

interface Device {
  slug: string;
  name: string;
  manufacturer: string;
  chip: string | null;
  batteryWh: number | null;
  tdpMin: number | null;
  tdpMax: number | null;
}

interface ConsensusData {
  fps_avg: number | null;
  fps_low: number | null;
  recommended_preset: string | null;
  recommended_tdp: number | null;
  estimated_battery: number | null;
  overall_verdict: string | null;
  report_count: number | null;
  confidence_level: string | null;
  devices: { slug: string; name: string } | null;
}

interface FpsCheckerProps {
  devices: Device[];
  suggestedGames?: { name: string; slug: string }[];
}

const DEBOUNCE_MS = 200;

const verdictInfo: Record<string, { label: string; color: string; ringClass: string }> = {
  excellent: { label: 'Excellent', color: '#34d399', ringClass: 'ring-g' },
  good: { label: 'Good', color: '#a3e635', ringClass: 'ring-g' },
  fair: { label: 'Fair', color: '#facc15', ringClass: 'ring-y' },
  poor: { label: 'Poor', color: '#f97316', ringClass: 'ring-o' },
  unplayable: { label: 'Unplayable', color: '#ef4444', ringClass: 'ring-o' },
};

function shortDeviceName(name: string): string {
  return name
    .replace('ASUS ', '')
    .replace('Lenovo ', '')
    .replace(' OLED', '')
    .replace('MSI ', '')
    .replace('Nintendo ', '');
}

function fpsColor(fps: number): string {
  if (fps >= 55) return 'g';
  if (fps >= 40) return 'l';
  if (fps >= 25) return 'y';
  return 'r';
}

export default function FpsChecker({ devices, suggestedGames = [] }: FpsCheckerProps) {
  const [selectedDevice, setSelectedDevice] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedGame, setSelectedGame] = useState<GameHit | null>(null);
  const [consensus, setConsensus] = useState<ConsensusData | null>(null);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.hits ?? []);
        setIsOpen((data.hits ?? []).length > 0);
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

  // Fetch consensus when game or device changes
  useEffect(() => {
    if (!selectedGame) {
      setConsensus(null);
      return;
    }

    const device = devices[selectedDevice];
    if (!device) return;

    setConsensusLoading(true);
    const controller = new AbortController();

    fetch(`/api/consensus?game=${encodeURIComponent(selectedGame.slug)}&device=${encodeURIComponent(device.slug)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        const items = json.data ?? [];
        setConsensus(items.length > 0 ? items[0] : null);
      })
      .catch(() => setConsensus(null))
      .finally(() => setConsensusLoading(false));

    return () => controller.abort();
  }, [selectedGame, selectedDevice, devices]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectGame = useCallback((game: GameHit) => {
    setSelectedGame(game);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectGame(results[selectedIndex]);
      }
    },
    [isOpen, results, selectedIndex, selectGame],
  );

  const device = devices[selectedDevice];

  // Determine what to show in the FPS ring
  const fpsAvg = consensus?.fps_avg;
  const verdict = consensus?.overall_verdict;
  const vInfo = verdict ? verdictInfo[verdict] ?? null : null;

  return (
    <div className="checker-section">
      <div className="checker-header">
        <h2>Can Your Handheld Run It?</h2>
        <p>Pick a device and game — get the answer instantly</p>
      </div>
      <div className="checker-card">
        {/* Toolbar: devices + game search */}
        <div className="checker-toolbar">
          <div className="checker-devices">
            {devices.map((d, i) => (
              <button
                key={d.slug}
                className={`dev-btn${i === selectedDevice ? ' active' : ''}`}
                onClick={() => setSelectedDevice(i)}
                type="button"
              >
                {shortDeviceName(d.name)}
              </button>
            ))}
          </div>
          <div className="checker-sep" />
          <div className="checker-game-input" ref={dropdownRef} style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a game name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
            {isLoading && (
              <svg
                style={{ width: 14, height: 14, flexShrink: 0, animation: 'spin 1s linear infinite' }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  style={{ opacity: 0.75 }}
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}

            {/* Dropdown results */}
            {isOpen && results.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: '#0e0c16',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  zIndex: 50,
                }}
              >
                {results.map((hit, i) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => selectGame(hit)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      background: i === selectedIndex ? 'rgba(255,255,255,0.04)' : 'transparent',
                      border: 'none',
                      borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#eeeef0',
                      fontSize: 13,
                    }}
                  >
                    {(hit.capsule_image || hit.header_image) && (
                      <img
                        src={hit.capsule_image || hit.header_image}
                        alt=""
                        style={{
                          width: 56,
                          height: 32,
                          borderRadius: 4,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        loading="lazy"
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hit.name}
                      </div>
                      {hit.genres && hit.genres.length > 0 && (
                        <div style={{ fontSize: 11, color: '#4a4560', marginTop: 1 }}>
                          {hit.genres.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Result display */}
        {selectedGame ? (
          <div className="checker-result">
            <div
              className="checker-result-bg"
              style={{ backgroundImage: `url('${selectedGame.header_image}')` }}
            />
            <img
              className="checker-game-art"
              src={selectedGame.header_image}
              alt={selectedGame.name}
            />
            <div className="checker-result-body">
              <h3>{selectedGame.name}</h3>
              <div className="checker-device-name">
                on {device?.name ?? 'Unknown Device'} &middot;{' '}
                {selectedGame.genres?.slice(0, 2).join(', ') ?? ''}
              </div>
              <div className="checker-meta">
                {consensus?.estimated_battery && (
                  <div className="checker-meta-item">
                    <svg viewBox="0 0 24 24">
                      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
                      <line x1="23" y1="13" x2="23" y2="11" />
                    </svg>
                    <div>
                      <div className="checker-meta-val">
                        ~{consensus.estimated_battery.toFixed(1)}h
                      </div>
                      <div className="checker-meta-label">est. battery</div>
                    </div>
                  </div>
                )}
                {consensus?.recommended_tdp && (
                  <div className="checker-meta-item">
                    <svg viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <div>
                      <div className="checker-meta-val">
                        {consensus.recommended_tdp}W
                      </div>
                      <div className="checker-meta-label">rec. TDP</div>
                    </div>
                  </div>
                )}
                {consensus?.recommended_preset && (
                  <div className="checker-meta-item">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    <div>
                      <div className="checker-meta-val" style={{ textTransform: 'capitalize' }}>
                        {consensus.recommended_preset}
                      </div>
                      <div className="checker-meta-label">preset</div>
                    </div>
                  </div>
                )}
                {!consensus && !consensusLoading && selectedGame.metacritic_score && (
                  <div className="checker-meta-item">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <div>
                      <div className="checker-meta-val">{selectedGame.metacritic_score}</div>
                      <div className="checker-meta-label">metacritic</div>
                    </div>
                  </div>
                )}
              </div>
              <a className="checker-result-link" href={`/games/${selectedGame.slug}`}>
                View full page{' '}
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="checker-fps-display">
              {consensusLoading ? (
                <div className="checker-fps-ring">
                  <div>
                    <svg
                      style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#4a4560' }}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                </div>
              ) : fpsAvg ? (
                <>
                  <div className={`checker-fps-ring ${vInfo?.ringClass ?? (fpsAvg >= 55 ? 'ring-g' : fpsAvg >= 30 ? 'ring-y' : 'ring-o')}`}>
                    <div>
                      <div className={`checker-fps-big ${fpsColor(fpsAvg)}`}>
                        {Math.round(fpsAvg)}
                      </div>
                      <div className="checker-fps-unit">AVG FPS</div>
                    </div>
                  </div>
                  <div className={`checker-verdict ${fpsColor(fpsAvg)}`}>
                    {verdict ? (verdictInfo[verdict]?.label ?? verdict) : (fpsAvg >= 55 ? 'Great' : fpsAvg >= 30 ? 'Playable' : 'Rough')}
                  </div>
                  {consensus?.report_count && (
                    <div style={{ fontSize: 11, color: '#4a4560', marginTop: 4 }}>
                      Based on {consensus.report_count} report{consensus.report_count > 1 ? 's' : ''}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="checker-fps-ring">
                    <div>
                      <div className="checker-fps-big" style={{ color: '#4a4560' }}>?</div>
                      <div className="checker-fps-unit">FPS</div>
                    </div>
                  </div>
                  <div className="checker-verdict" style={{ color: '#4a4560' }}>
                    No data yet
                  </div>
                  <a
                    href="/report/new"
                    style={{ fontSize: 12, color: '#c4b5fd', marginTop: 6, textDecoration: 'none' }}
                  >
                    Be the first to report →
                  </a>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              color: '#4a4560',
              fontSize: 14,
              gap: 8,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search for a game above to check compatibility
          </div>
        )}

        {/* Suggested games */}
        {suggestedGames.length > 0 && (
          <div className="checker-picks">
            <span>Try:</span>
            {suggestedGames.map((g) => (
              <a key={g.slug} href={`/games/${g.slug}`}>
                {g.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
