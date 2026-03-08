import { useState, useMemo } from 'react';

interface HeatmapEntry {
  gameName: string;
  gameSlug: string;
  fpsAvg: number;
  rating: string;
  preset: string;
  reportCount: number;
}

interface Props {
  data: HeatmapEntry[];
  deviceName: string;
  deviceSlug: string;
}

type SortMode = 'fps-desc' | 'fps-asc' | 'name' | 'rating' | 'reports';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'fps-desc', label: 'FPS (Best)' },
  { value: 'fps-asc', label: 'FPS (Lowest)' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'rating', label: 'Rating' },
  { value: 'reports', label: 'Most Reports' },
];

const RATING_ORDER: Record<string, number> = {
  excellent: 0,
  good: 1,
  fair: 2,
  poor: 3,
  unplayable: 4,
};

function getFpsColor(fps: number): {
  bg: string;
  border: string;
  text: string;
  label: string;
} {
  if (fps >= 60) {
    return {
      bg: 'bg-[#60A5FA]/15',
      border: 'border-[#60A5FA]/30',
      text: 'text-[#60A5FA]',
      label: 'Excellent',
    };
  }
  if (fps >= 40) {
    return {
      bg: 'bg-green-500/15',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: 'Good',
    };
  }
  if (fps >= 30) {
    return {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Fair',
    };
  }
  if (fps >= 20) {
    return {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      label: 'Poor',
    };
  }
  return {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    label: 'Unplayable',
  };
}

function getFpsBarWidth(fps: number): number {
  // Scale: 0-120 FPS mapped to 0-100% width
  return Math.min(100, (fps / 120) * 100);
}

function getFpsBarColor(fps: number): string {
  if (fps >= 60) return 'bg-[#60A5FA]';
  if (fps >= 40) return 'bg-green-500';
  if (fps >= 30) return 'bg-yellow-500';
  if (fps >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function PerformanceHeatmap({ data, deviceName, deviceSlug }: Props) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('fps-desc');

  const filteredAndSorted = useMemo(() => {
    let result = [...data];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((entry) =>
        entry.gameName.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortMode) {
      case 'fps-desc':
        result.sort((a, b) => b.fpsAvg - a.fpsAvg);
        break;
      case 'fps-asc':
        result.sort((a, b) => a.fpsAvg - b.fpsAvg);
        break;
      case 'name':
        result.sort((a, b) => a.gameName.localeCompare(b.gameName));
        break;
      case 'rating':
        result.sort(
          (a, b) =>
            (RATING_ORDER[a.rating] ?? 5) - (RATING_ORDER[b.rating] ?? 5),
        );
        break;
      case 'reports':
        result.sort((a, b) => b.reportCount - a.reportCount);
        break;
    }

    return result;
  }, [data, search, sortMode]);

  // Stats summary
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const avgFps = data.reduce((sum, d) => sum + d.fpsAvg, 0) / data.length;
    const excellent = data.filter((d) => d.fpsAvg >= 60).length;
    const good = data.filter((d) => d.fpsAvg >= 40 && d.fpsAvg < 60).length;
    const fair = data.filter((d) => d.fpsAvg >= 30 && d.fpsAvg < 40).length;
    const poor = data.filter((d) => d.fpsAvg < 30).length;
    return { avgFps: Math.round(avgFps), excellent, good, fair, poor, total: data.length };
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Performance Heatmap</h3>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {data.length} game{data.length !== 1 ? 's' : ''} tested on the {deviceName}
          </p>
        </div>

        {/* Quick stats pills */}
        {stats && (
          <div className="flex flex-wrap gap-2">
            {stats.excellent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#60A5FA]/10 border border-[#60A5FA]/20 px-2.5 py-1 text-xs text-[#60A5FA]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                {stats.excellent} excellent
              </span>
            )}
            {stats.good > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-xs text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {stats.good} good
              </span>
            )}
            {stats.fair > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 text-xs text-yellow-400">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                {stats.fair} fair
              </span>
            )}
            {stats.poor > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {stats.poor} poor
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls: search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#3A3D45] bg-[#2A2D35] pl-10 pr-4 py-2 text-sm text-white placeholder-[#6B7280] focus:border-[#60A5FA] focus:outline-none focus:ring-1 focus:ring-[#60A5FA]"
          />
        </div>

        {/* Sort dropdown */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-lg border border-[#3A3D45] bg-[#2A2D35] px-3 py-2 text-sm text-gray-300 focus:border-[#60A5FA] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#60A5FA]" />
          60+ FPS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          40-59 FPS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-yellow-500" />
          30-39 FPS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
          20-29 FPS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          &lt;20 FPS
        </span>
      </div>

      {/* Heatmap grid */}
      {filteredAndSorted.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredAndSorted.map((entry) => {
            const color = getFpsColor(entry.fpsAvg);

            return (
              <a
                key={entry.gameSlug}
                href={`/games/${entry.gameSlug}/${deviceSlug}`}
                className={`group relative rounded-lg border ${color.border} ${color.bg} p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
              >
                {/* Game name and FPS */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate group-hover:text-[#93C5FD] transition-colors">
                      {entry.gameName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#9CA3AF]">
                      {entry.preset && (
                        <span className="capitalize">{entry.preset}</span>
                      )}
                      <span className="text-gray-600">|</span>
                      <span>
                        {entry.reportCount} report{entry.reportCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* FPS badge */}
                  <div className={`flex-shrink-0 rounded-lg px-2.5 py-1 ${color.bg} border ${color.border}`}>
                    <p className={`text-lg font-bold ${color.text} leading-none`}>
                      {Math.round(entry.fpsAvg)}
                    </p>
                    <p className={`text-[10px] ${color.text} opacity-70 text-center`}>FPS</p>
                  </div>
                </div>

                {/* FPS bar visualization */}
                <div className="mt-2 h-1 bg-[#2A2D35] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getFpsBarColor(entry.fpsAvg)} rounded-full transition-all duration-300`}
                    style={{ width: `${getFpsBarWidth(entry.fpsAvg)}%` }}
                  />
                </div>

                {/* Hover arrow indicator */}
                <svg
                  className="absolute top-3 right-3 h-3.5 w-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#3A3D45] bg-[#16181D]/50 p-8 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-600 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[#9CA3AF] text-sm">No games match "{search}"</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-xs text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Results count when filtering */}
      {search.trim() && filteredAndSorted.length > 0 && (
        <p className="text-xs text-[#6B7280] text-center">
          Showing {filteredAndSorted.length} of {data.length} games
        </p>
      )}
    </div>
  );
}
