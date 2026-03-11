import type { InferSelectModel } from 'drizzle-orm';
import type { comments } from '@lib/db/schema';

export type Comment = InferSelectModel<typeof comments>;

export interface CommentWithAuthor extends Comment {
  author: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: string | null;
    isVerifiedTester: boolean;
  };
  reactions: Record<string, number>;
  userReactions?: string[];
  replies?: CommentWithAuthor[];
}
