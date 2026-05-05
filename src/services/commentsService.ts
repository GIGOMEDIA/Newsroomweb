import { commentsApi } from '@/api/commentsApi';
import { Comment, CommentVerdict, VoteValue } from '@/types/comment';
import { withTimeout } from '@/utils/async';

import { cacheService } from './cacheService';
import {
  pendingActionsService,
  PendingComment,
  PendingVote,
} from './pendingActionsService';
import { userProfileService } from './userProfileService';

/** Per-article cache key, e.g. `comments:abc123`. */
const cacheKey = (articleId: string) => `comments:${articleId}`;
const WRITE_TIMEOUT_MS = 12000;

/** Pulls a friendly message off any thrown value. Used to surface API errors
 * to users without leaking stack traces or raw provider text. */
const toMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not reach the community service.';
};

export const commentsService = {
  /** Reads the locally cached comment list for an article so the UI can
   * render instantly while the live subscription warms up. */
  async getCachedComments(articleId: string): Promise<Comment[]> {
    const cached = await cacheService.get<Comment[]>(cacheKey(articleId));
    return cached?.data ?? [];
  },

  /** Persists a comment list to the cache (called after each subscription
   * tick so reopening the article shows the most recent state offline). */
  async cacheComments(articleId: string, comments: Comment[]): Promise<void> {
    await cacheService.set(cacheKey(articleId), comments);
  },

  /**
   * Opens a Firestore real-time subscription to the comments collection.
   * Each emission is forwarded to `callback` and *also* persisted to the
   * cache as a side effect, so the UI's offline read stays current with
   * what was last seen online. Returns the unsubscribe function.
   */
  subscribe(
    articleId: string,
    callback: (comments: Comment[]) => void,
    onError?: (error: Error) => void,
  ) {
    return commentsApi.subscribe(
      articleId,
      (comments) => {
        callback(comments);
        void cacheService.set(cacheKey(articleId), comments);
      },
      onError,
    );
  },

  /** Backfills each comment with the current user's vote (which isn't part
   * of the public comment doc). Delegates entirely to the API layer. */
  async hydrateMyVotes(
    articleId: string,
    comments: Comment[],
    uid: string,
  ): Promise<Comment[]> {
    return commentsApi.hydrateMyVotes(articleId, comments, uid);
  },

  /**
   * Posts a comment, with offline-first semantics:
   *   - Empty (after trim) → returns a validation error, no queueing.
   *   - Offline → enqueues for later replay, returns `{ pending: true }`.
   *   - Online → tries the API with a 12s timeout; on failure also enqueues
   *     so the user's comment is never silently dropped.
   *
   * `authorVerified` is fetched from `userProfileService` so the queued
   * payload carries the verified flag the comment was written under (rather
   * than re-resolving at replay time).
   */
  async postComment({
    articleId,
    user,
    text,
    verdict,
    isOnline,
  }: {
    articleId: string;
    user: { uid: string; email: string };
    text: string;
    verdict: CommentVerdict | null;
    isOnline: boolean;
  }): Promise<{ pending: boolean; queueId?: string; error?: string }> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { error: 'Comment cannot be empty.', pending: false };
    }

    const profile = await userProfileService.getProfile(user.uid);
    const payload = {
      authorEmail: user.email,
      authorUid: user.uid,
      authorVerified: profile.verified,
      text: trimmed,
      verdict,
    };

    if (!isOnline) {
      const queued = await pendingActionsService.enqueueComment({
        articleId,
        payload,
      });
      return { pending: true, queueId: queued.id };
    }

    try {
      await withTimeout(
        commentsApi.postComment(articleId, payload),
        WRITE_TIMEOUT_MS,
      );
      return { pending: false };
    } catch (error) {
      const queued = await pendingActionsService.enqueueComment({
        articleId,
        payload,
      });
      return {
        error: toMessage(error),
        pending: true,
        queueId: queued.id,
      };
    }
  },

  /**
   * Casts/changes/clears a vote on a comment. Same offline-first contract as
   * postComment: queues when offline or on failure, never blocks the user.
   * Returns `myVote` so the UI can paint the new state immediately, even if
   * the underlying write hasn't actually committed yet.
   */
  async voteOnComment({
    articleId,
    commentId,
    user,
    nextVote,
    isOnline,
  }: {
    articleId: string;
    commentId: string;
    user: { uid: string };
    nextVote: VoteValue;
    isOnline: boolean;
  }): Promise<{
    pending: boolean;
    myVote: VoteValue | null;
    queueId?: string;
    error?: string;
  }> {
    if (!isOnline) {
      const queued = await pendingActionsService.enqueueVote({
        articleId,
        payload: {
          authorUid: user.uid,
          commentId,
          vote: nextVote,
        },
      });
      return { myVote: nextVote, pending: true, queueId: queued.id };
    }

    try {
      const result = await withTimeout(
        commentsApi.voteOnComment(articleId, commentId, user.uid, nextVote),
        WRITE_TIMEOUT_MS,
      );
      return { myVote: result.myVote, pending: false };
    } catch (error) {
      const queued = await pendingActionsService.enqueueVote({
        articleId,
        payload: {
          authorUid: user.uid,
          commentId,
          vote: nextVote,
        },
      });
      return {
        error: toMessage(error),
        myVote: nextVote,
        pending: true,
        queueId: queued.id,
      };
    }
  },

  /**
   * Drains queued comment + vote actions by routing each to the matching
   * API call. Other action types in the queue (evidence) are left
   * untouched — `evidenceService.replayPending` handles those separately.
   */
  async replayPending(): Promise<{ succeeded: number; failed: number }> {
    return pendingActionsService.replay({
      async comment(action: PendingComment) {
        await commentsApi.postComment(action.articleId, action.payload);
      },
      async vote(action: PendingVote) {
        await commentsApi.voteOnComment(
          action.articleId,
          action.payload.commentId,
          action.payload.authorUid,
          action.payload.vote,
        );
      },
    });
  },
};
