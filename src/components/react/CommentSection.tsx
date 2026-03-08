import { useState, useEffect, useCallback, useRef } from 'react';

/* ───── Types ───── */

interface CommentUser {
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  game_id: string;
  user_id: string;
  parent_id: string | null;
  depth: number;
  body: string | null;
  body_html: string | null;
  upvotes: number;
  downvotes: number;
  is_edited: boolean;
  is_deleted: boolean;
  is_flagged: boolean;
  created_at: string;
  user: CommentUser;
}

interface Props {
  gameId: string;
  currentUserId?: string | null;
}

const PAGE_SIZE = 20;
const MAX_DEPTH = 3;

/* ───── Helpers ───── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ───── Main Component ───── */

export default function CommentSection({ gameId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // Fetch comments
  const fetchComments = useCallback(
    async (newOffset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await fetch(
          `/api/comments?gameId=${encodeURIComponent(gameId)}&offset=${newOffset}&limit=${PAGE_SIZE}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to fetch');

        if (append) {
          setComments(prev => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        setTotal(data.total);
        setOffset(newOffset + data.comments.length);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [gameId],
  );

  useEffect(() => {
    fetchComments(0, false);
  }, [fetchComments]);

  // Add a new comment to state (optimistic after POST succeeds)
  const addComment = useCallback((comment: Comment) => {
    setComments(prev => [comment, ...prev]);
    setTotal(t => t + 1);
  }, []);

  // Update a comment in state after vote
  const updateComment = useCallback((id: string, patch: Partial<Comment>) => {
    setComments(prev =>
      prev.map(c => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  // Remove (soft-delete) a comment in state
  const softDeleteComment = useCallback((id: string) => {
    setComments(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, is_deleted: true, body: null, body_html: null, user: { display_name: null, avatar_url: null } }
          : c,
      ),
    );
  }, []);

  const hasMore = comments.length < total;

  // Build threaded structure
  const threaded = buildTree(comments);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">
        Comments{' '}
        {total > 0 && (
          <span className="text-sm font-normal text-[#6B7280]">({total})</span>
        )}
      </h3>

      {/* Top-level comment form */}
      <CommentForm
        gameId={gameId}
        currentUserId={currentUserId}
        onSubmit={addComment}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="h-6 w-6 animate-spin text-[#6B7280]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#6B7280]">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          {/* Comment list */}
          <div className="space-y-1">
            {threaded.map(node => (
              <CommentThread
                key={node.comment.id}
                node={node}
                gameId={gameId}
                currentUserId={currentUserId}
                onReply={addComment}
                onVote={updateComment}
                onDelete={softDeleteComment}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => fetchComments(offset, true)}
                disabled={loadingMore}
                className="rounded-lg border border-[#3A3D45] px-5 py-2 text-sm text-gray-300 hover:border-[#4B5563] hover:text-white transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  `Load more comments (${comments.length} of ${total})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───── Tree Building ───── */

interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Create nodes for all comments
  for (const c of comments) {
    nodeMap.set(c.id, { comment: c, children: [] });
  }

  // Build tree
  for (const c of comments) {
    const node = nodeMap.get(c.id)!;
    if (c.parent_id && nodeMap.has(c.parent_id)) {
      nodeMap.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by created_at ascending (oldest first within thread)
  const sortChildren = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime());
    for (const n of nodes) sortChildren(n.children);
  };
  for (const r of roots) sortChildren(r.children);

  return roots;
}

/* ───── Comment Thread ───── */

interface CommentThreadProps {
  node: CommentNode;
  gameId: string;
  currentUserId?: string | null;
  onReply: (comment: Comment) => void;
  onVote: (id: string, patch: Partial<Comment>) => void;
  onDelete: (id: string) => void;
}

function CommentThread({ node, gameId, currentUserId, onReply, onVote, onDelete }: CommentThreadProps) {
  const { comment } = node;
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  const indentLevel = Math.min(comment.depth, MAX_DEPTH);

  const handleVote = async (isUpvote: boolean) => {
    if (!currentUserId) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (voteLoading) return;

    setVoteLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', commentId: comment.id, isUpvote }),
      });
      const result = await res.json();
      if (!res.ok) return;

      let newUpvotes = comment.upvotes;
      let newDownvotes = comment.downvotes;

      if (result.action === 'removed') {
        if (isUpvote) newUpvotes = Math.max(0, newUpvotes - 1);
        else newDownvotes = Math.max(0, newDownvotes - 1);
        setUserVote(null);
      } else if (result.action === 'changed') {
        if (isUpvote) {
          newUpvotes += 1;
          newDownvotes = Math.max(0, newDownvotes - 1);
        } else {
          newUpvotes = Math.max(0, newUpvotes - 1);
          newDownvotes += 1;
        }
        setUserVote(isUpvote);
      } else if (result.action === 'created') {
        if (isUpvote) newUpvotes += 1;
        else newDownvotes += 1;
        setUserVote(isUpvote);
      }

      onVote(comment.id, { upvotes: newUpvotes, downvotes: newDownvotes });
    } catch {
      // Ignore
    } finally {
      setVoteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteLoading) return;
    if (!confirm('Delete this comment? This cannot be undone.')) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(comment.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete(comment.id);
      }
    } catch {
      // Ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReplySubmitted = (newComment: Comment) => {
    onReply(newComment);
    setShowReplyForm(false);
  };

  // Deleted comment placeholder
  if (comment.is_deleted) {
    return (
      <div style={{ paddingLeft: indentLevel > 0 ? `${indentLevel * 24}px` : undefined }}>
        <div className="rounded-lg border border-[#2A2D35]/50 bg-[#16181D]/30 px-4 py-3 my-1">
          <p className="text-sm text-gray-600 italic">[deleted]</p>
        </div>
        {node.children.length > 0 && (
          <div>
            {node.children.map(child => (
              <CommentThread
                key={child.comment.id}
                node={child}
                gameId={gameId}
                currentUserId={currentUserId}
                onReply={onReply}
                onVote={onVote}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const score = comment.upvotes - comment.downvotes;

  return (
    <div style={{ paddingLeft: indentLevel > 0 ? `${indentLevel * 24}px` : undefined }}>
      <div className="rounded-lg border border-[#2A2D35] bg-[#16181D]/50 px-4 py-3 my-1">
        {/* Header: avatar + name + time */}
        <div className="flex items-center gap-2.5 mb-2">
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 flex-shrink-0">
              <span className="text-[10px] font-bold text-[#9CA3AF]">
                {getInitials(comment.user.display_name)}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-200">
            {comment.user.display_name ?? 'Anonymous'}
          </span>
          <span className="text-xs text-gray-600">
            {relativeTime(comment.created_at)}
          </span>
          {comment.is_edited && (
            <span className="text-xs text-gray-600 italic">(edited)</span>
          )}
        </div>

        {/* Body */}
        <div
          className="text-sm text-gray-300 leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: comment.body_html ?? '' }}
        />

        {/* Actions: vote + reply + delete */}
        <div className="flex items-center gap-3">
          {/* Vote buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote(true)}
              disabled={voteLoading}
              className={`p-1 rounded transition-colors ${
                userVote === true
                  ? 'text-[#60A5FA] hover:text-[#93C5FD]'
                  : 'text-gray-600 hover:text-[#9CA3AF]'
              }`}
              title="Upvote"
            >
              <svg className="h-4 w-4" fill={userVote === true ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <span
              className={`text-xs font-medium min-w-[1.25rem] text-center ${
                score > 0 ? 'text-[#60A5FA]' : score < 0 ? 'text-red-400' : 'text-gray-600'
              }`}
            >
              {score}
            </span>
            <button
              onClick={() => handleVote(false)}
              disabled={voteLoading}
              className={`p-1 rounded transition-colors ${
                userVote === false
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-gray-600 hover:text-[#9CA3AF]'
              }`}
              title="Downvote"
            >
              <svg className="h-4 w-4" fill={userVote === false ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Reply button (only if depth < MAX_DEPTH) */}
          {comment.depth < MAX_DEPTH && (
            <button
              onClick={() => {
                if (!currentUserId) {
                  window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
                  return;
                }
                setShowReplyForm(s => !s);
              }}
              className="text-xs text-gray-600 hover:text-[#9CA3AF] transition-colors"
            >
              Reply
            </button>
          )}

          {/* Delete button (only for comment author) */}
          {currentUserId && currentUserId === comment.user_id && (
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors ml-auto"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {/* Inline reply form */}
        {showReplyForm && (
          <div className="mt-3 pt-3 border-t border-[#2A2D35]">
            <CommentForm
              gameId={gameId}
              currentUserId={currentUserId}
              parentId={comment.id}
              parentDepth={comment.depth}
              onSubmit={handleReplySubmitted}
              onCancel={() => setShowReplyForm(false)}
              compact
            />
          </div>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <CommentThread
              key={child.comment.id}
              node={child}
              gameId={gameId}
              currentUserId={currentUserId}
              onReply={onReply}
              onVote={onVote}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Comment Form ───── */

interface CommentFormProps {
  gameId: string;
  currentUserId?: string | null;
  parentId?: string;
  parentDepth?: number;
  onSubmit: (comment: Comment) => void;
  onCancel?: () => void;
  compact?: boolean;
}

function CommentForm({ gameId, currentUserId, parentId, parentDepth, onSubmit, onCancel, compact }: CommentFormProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (compact && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [compact]);

  if (!currentUserId) {
    return (
      <div className="rounded-lg border border-[#2A2D35] bg-[#16181D]/50 px-4 py-4 text-center">
        <p className="text-sm text-[#6B7280] mb-2">Sign in to join the conversation</p>
        <a
          href={'/auth/login?redirect=' + encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#60A5FA] px-4 py-2 text-sm font-medium text-white hover:bg-[#60A5FA] transition-colors"
        >
          Sign in
        </a>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          body: body.trim(),
          parentId: parentId ?? undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to post');

      onSubmit(result.comment);
      setBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={5000}
        rows={compact ? 2 : 3}
        placeholder={parentId ? 'Write a reply...' : 'Share your thoughts on this game...'}
        className="w-full rounded-lg border border-[#3A3D45] bg-[#2A2D35] py-2.5 px-4 text-sm text-white placeholder-[#6B7280] focus:border-[#60A5FA] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] resize-none"
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          {body.length > 0 && `${body.length}/5000`}
          {body.length === 0 && compact ? '' : body.length === 0 ? 'Ctrl+Enter to submit' : ' \u00b7 Ctrl+Enter to submit'}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="rounded-lg bg-[#60A5FA] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#60A5FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? 'Posting...' : parentId ? 'Reply' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
