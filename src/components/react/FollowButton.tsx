import { useState, useCallback } from 'react';

interface Props {
  gameId: string;
  initialFollowing: boolean;
  followerCount?: number;
}

export default function FollowButton({ gameId, initialFollowing, followerCount: initialCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (loading) return;

    // Optimistic update
    const prevFollowing = following;
    const prevCount = count;
    setFollowing(!following);
    setCount(following ? Math.max(0, count - 1) : count + 1);

    setLoading(true);
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (res.status === 401) {
        // Not authenticated — revert and redirect to login
        setFollowing(prevFollowing);
        setCount(prevCount);
        window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      if (!res.ok) {
        // Revert on error
        setFollowing(prevFollowing);
        setCount(prevCount);
        return;
      }

      const data = await res.json();
      // Sync with server state
      setFollowing(data.following);
      if (typeof data.followerCount === 'number') {
        setCount(data.followerCount);
      }
    } catch {
      // Revert on network error
      setFollowing(prevFollowing);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  }, [gameId, following, count, loading]);

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
        following
          ? 'border-[#D4A574]/30 bg-[#D4A574]/10 text-[#D4A574] hover:bg-[#D4A574]/20'
          : 'border-[#44403C] bg-[#292524] text-gray-400 hover:border-[#57534E] hover:text-gray-200'
      } ${loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
      title={following ? 'Unfollow this game' : 'Follow this game'}
    >
      {/* Heart icon */}
      <svg
        className="h-4 w-4 flex-shrink-0"
        fill={following ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span>{following ? 'Following' : 'Follow'}</span>
      {count > 0 && (
        <span
          className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs leading-none ${
            following
              ? 'bg-[#D4A574]/20 text-[#E8C5A0]'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
