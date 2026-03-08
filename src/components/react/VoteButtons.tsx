import { useState, useCallback } from 'react';

interface Props {
  reportId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  userVote: boolean | null; // true = upvoted, false = downvoted, null = no vote
  isLoggedIn: boolean;
}

export default function VoteButtons({ reportId, initialUpvotes, initialDownvotes, userVote, isLoggedIn }: Props) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [vote, setVote] = useState<boolean | null>(userVote);
  const [loading, setLoading] = useState(false);

  const handleVote = useCallback(async (isUpvote: boolean) => {
    if (!isLoggedIn) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, isUpvote }),
      });
      const result = await res.json();

      if (result.action === 'removed') {
        // Toggle off
        if (isUpvote) setUpvotes(v => Math.max(0, v - 1));
        else setDownvotes(v => Math.max(0, v - 1));
        setVote(null);
      } else if (result.action === 'changed') {
        // Switched direction
        if (isUpvote) {
          setUpvotes(v => v + 1);
          setDownvotes(v => Math.max(0, v - 1));
        } else {
          setUpvotes(v => Math.max(0, v - 1));
          setDownvotes(v => v + 1);
        }
        setVote(isUpvote);
      } else if (result.action === 'created') {
        if (isUpvote) setUpvotes(v => v + 1);
        else setDownvotes(v => v + 1);
        setVote(isUpvote);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [reportId, loading, isLoggedIn]);

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(true)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          vote === true
            ? 'text-cyan-400 hover:text-cyan-300'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Helpful"
      >
        <svg className="h-4 w-4" fill={vote === true ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75" />
        </svg>
      </button>
      <span className={`text-xs font-medium min-w-[1.5rem] text-center ${
        score > 0 ? 'text-cyan-400' : score < 0 ? 'text-red-400' : 'text-gray-500'
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        onClick={() => handleVote(false)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          vote === false
            ? 'text-red-400 hover:text-red-300'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Not helpful"
      >
        <svg className="h-4 w-4" fill={vote === false ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 012.25 12c0-2.848.992-5.464 2.649-7.521C5.287 3.997 5.886 3.75 6.504 3.75h4.369a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
        </svg>
      </button>
    </div>
  );
}
