import { useState, useCallback } from 'react';

interface MatchedGame {
  id: string;
  name: string;
  slug: string;
  headerImage: string | null;
  playtimeMinutes: number;
}

interface ImportResult {
  imported: number;
  matched: number;
  totalOwned: number;
  games: MatchedGame[];
}

interface Props {
  currentUserId: string;
}

/**
 * Parse a raw input string into whatever should be sent to the API.
 * Accepts:
 *   - Full Steam profile URLs (steamcommunity.com/id/xxx or /profiles/xxx)
 *   - 64-bit Steam IDs
 *   - Vanity names
 */
function normalizeSteamInput(raw: string): string {
  const trimmed = raw.trim();
  // Strip trailing slashes from URLs
  return trimmed.replace(/\/+$/, '');
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

type Phase = 'idle' | 'loading' | 'success' | 'error';

export default function SteamImport({ currentUserId: _userId }: Props) {
  void _userId; // Reserved for future use (e.g. pre-loading existing library)
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showAllGames, setShowAllGames] = useState(false);

  const handleImport = useCallback(async () => {
    const steamId = normalizeSteamInput(input);
    if (!steamId) return;

    setPhase('loading');
    setErrorMessage('');
    setResult(null);
    setShowAllGames(false);

    try {
      const res = await fetch('/api/steam-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhase('error');
        setErrorMessage(data.error || `Import failed (HTTP ${res.status})`);
        return;
      }

      setResult(data as ImportResult);
      setPhase('success');
    } catch (err) {
      setPhase('error');
      setErrorMessage('Network error. Please try again.');
    }
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && phase !== 'loading') {
        handleImport();
      }
    },
    [handleImport, phase],
  );

  const handleReset = useCallback(() => {
    setPhase('idle');
    setInput('');
    setResult(null);
    setErrorMessage('');
    setShowAllGames(false);
  }, []);

  const PREVIEW_COUNT = 10;
  const gamesToShow =
    result && !showAllGames ? result.games.slice(0, PREVIEW_COUNT) : result?.games ?? [];
  const hasMore = (result?.games.length ?? 0) > PREVIEW_COUNT;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800">
          {/* Steam icon */}
          <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.979 0C5.678 0 .511 4.86.022 10.895l6.432 2.658a3.387 3.387 0 0 1 1.912-.593c.064 0 .127.003.19.008l2.862-4.142v-.058c0-2.495 2.03-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.91c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25a2.544 2.544 0 0 0 3.32-1.381 2.53 2.53 0 0 0-.005-1.949 2.527 2.527 0 0 0-1.371-1.37 2.524 2.524 0 0 0-1.872-.044l1.523.63a1.868 1.868 0 0 1-1.436 3.474zm9.405-8.972a3.016 3.016 0 0 0-3.015-3.015 3.016 3.016 0 1 0 3.015 3.015zm-5.276.003a2.264 2.264 0 1 1 4.527 0 2.264 2.264 0 0 1-4.527 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Import Steam Library</h3>
          <p className="text-xs text-gray-500">
            Sync your Steam games to track compatibility across devices
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Input section -- shown in idle, loading, and error states */}
        {phase !== 'success' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="steam-id-input" className="mb-1.5 block text-xs font-medium text-gray-400">
                Steam Profile URL or ID
              </label>
              <div className="flex gap-2">
                <input
                  id="steam-id-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={phase === 'loading'}
                  placeholder="steamcommunity.com/id/yourname or 76561198..."
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleImport}
                  disabled={phase === 'loading' || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phase === 'loading' ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    'Import Library'
                  )}
                </button>
              </div>
            </div>

            {/* Loading progress message */}
            {phase === 'loading' && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/40 px-3 py-2.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-400">
                  Fetching your Steam library and matching against our database...
                </span>
              </div>
            )}

            {/* Error message */}
            {phase === 'error' && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <p className="text-xs text-red-300">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Help text */}
            <p className="text-[11px] text-gray-600">
              Your Steam profile game details must be set to public.{' '}
              <a
                href="https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500/70 hover:text-emerald-400 transition-colors"
              >
                How to change privacy settings
              </a>
            </p>
          </div>
        )}

        {/* Success state */}
        {phase === 'success' && result && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-white">Import complete</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-800/60 p-3 text-center">
                <p className="text-lg font-bold text-white">{result.totalOwned}</p>
                <p className="text-[11px] text-gray-500">Games Owned</p>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{result.matched}</p>
                <p className="text-[11px] text-gray-500">Matched</p>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3 text-center">
                <p className="text-lg font-bold text-gray-400">{result.totalOwned - result.matched}</p>
                <p className="text-[11px] text-gray-500">Not in DB</p>
              </div>
            </div>

            {/* Matched games list */}
            {result.games.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-gray-400">
                  Matched Games ({result.matched})
                </h4>
                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-800 divide-y divide-gray-800/80">
                  {gamesToShow.map((game) => (
                    <a
                      key={game.id}
                      href={`/games/${game.slug}`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/60 transition-colors"
                    >
                      {game.headerImage ? (
                        <img
                          src={game.headerImage}
                          alt=""
                          className="h-8 w-14 flex-shrink-0 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-8 w-14 flex-shrink-0 items-center justify-center rounded bg-gray-800">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{game.name}</p>
                      </div>
                      {game.playtimeMinutes > 0 && (
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {formatPlaytime(game.playtimeMinutes)}
                        </span>
                      )}
                    </a>
                  ))}
                </div>

                {/* Show more / show less */}
                {hasMore && (
                  <button
                    onClick={() => setShowAllGames((v) => !v)}
                    className="mt-2 w-full rounded-lg border border-gray-800 py-1.5 text-xs text-gray-400 hover:border-gray-700 hover:text-gray-300 transition-colors"
                  >
                    {showAllGames
                      ? 'Show less'
                      : `Show all ${result.games.length} matched games`}
                  </button>
                )}
              </div>
            )}

            {result.matched === 0 && (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 px-3 py-3 text-center">
                <p className="text-sm text-gray-400">
                  None of your {result.totalOwned} Steam games are in our database yet.
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  We're constantly adding new games. Check back later!
                </p>
              </div>
            )}

            {/* Import again button */}
            <button
              onClick={handleReset}
              className="w-full rounded-lg border border-gray-700 py-2 text-xs font-medium text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors"
            >
              Import from a different account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
