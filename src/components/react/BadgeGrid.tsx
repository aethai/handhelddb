import { useState } from 'react';

interface Badge {
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt?: string | null;
}

interface Props {
  badges: Badge[];
}

const CATEGORY_ORDER = ['reporting', 'device', 'community', 'special'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  reporting: 'Reporting',
  device: 'Device',
  community: 'Community',
  special: 'Special',
};

const CATEGORY_ICONS: Record<string, string> = {
  reporting: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  device: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  community: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  special: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

export default function BadgeGrid({ badges }: Props) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  // Group badges by category
  const grouped = new Map<string, Badge[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }
  for (const badge of badges) {
    const list = grouped.get(badge.category);
    if (list) {
      list.push(badge);
    } else {
      // Unknown category, put in special
      const special = grouped.get('special');
      if (special) special.push(badge);
    }
  }

  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c6cf0]/15 border border-[#7c6cf0]/25">
            <svg className="h-4 w-4 text-[#7c6cf0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <span className="text-sm text-[#8a8a94]">
            <span className="font-semibold text-white">{earnedCount}</span>
            <span className="mx-1">/</span>
            <span>{badges.length}</span>
            <span className="ml-1">badges earned</span>
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-[#1a1a22] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7c6cf0] to-[#7c6cf0] rounded-full transition-all duration-500"
            style={{ width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Badge categories */}
      {CATEGORY_ORDER.map((category) => {
        const categoryBadges = grouped.get(category);
        if (!categoryBadges || categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-[#55555e]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[category]} />
              </svg>
              <h4 className="text-xs font-semibold text-[#8a8a94] uppercase tracking-wider">
                {CATEGORY_LABELS[category]}
              </h4>
              <span className="text-xs text-gray-600">
                {categoryBadges.filter((b) => b.earnedAt).length}/{categoryBadges.length}
              </span>
            </div>

            {/* Badge grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoryBadges.map((badge) => {
                const isEarned = !!badge.earnedAt;
                const isHovered = hoveredBadge === badge.name;
                const earnedDate = badge.earnedAt
                  ? new Date(badge.earnedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={badge.name}
                    className={`relative rounded-xl border p-4 text-center transition-all duration-200 cursor-default ${
                      isEarned
                        ? 'border-[#7c6cf0]/30 bg-[#7c6cf0]/5 hover:border-[#7c6cf0]/50 hover:bg-[#7c6cf0]/10'
                        : 'border-[#1a1a22] bg-[#0f0f12]/50 opacity-50 hover:opacity-70'
                    }`}
                    onMouseEnter={() => setHoveredBadge(badge.name)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    {/* Lock overlay for unearned */}
                    {!isEarned && (
                      <div className="absolute top-2 right-2">
                        <svg className="h-3.5 w-3.5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {/* Badge icon */}
                    <div className={`text-3xl mb-2 ${isEarned ? '' : 'grayscale'}`}>
                      {badge.icon}
                    </div>

                    {/* Badge name */}
                    <p className={`text-sm font-medium ${isEarned ? 'text-white' : 'text-[#55555e]'}`}>
                      {badge.name}
                    </p>

                    {/* Earned date or description */}
                    {isEarned && earnedDate ? (
                      <p className="mt-1 text-xs text-[#7c6cf0]/70">{earnedDate}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{badge.description}</p>
                    )}

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-48 rounded-lg border border-[#25252e] bg-[#1a1a22] p-3 shadow-xl pointer-events-none">
                        <p className="text-sm font-medium text-white">{badge.name}</p>
                        <p className="mt-1 text-xs text-[#8a8a94]">{badge.description}</p>
                        {isEarned && earnedDate && (
                          <p className="mt-1.5 text-xs text-[#7c6cf0]">Earned {earnedDate}</p>
                        )}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                          <div className="border-4 border-transparent border-t-[#25252e]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {badges.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#25252e] bg-[#0f0f12]/50 p-8 text-center">
          <div className="text-4xl mb-3">🏅</div>
          <p className="text-[#8a8a94] text-sm">No badges available yet.</p>
          <p className="text-[#55555e] text-xs mt-1">Start submitting reports to earn badges!</p>
        </div>
      )}
    </div>
  );
}
