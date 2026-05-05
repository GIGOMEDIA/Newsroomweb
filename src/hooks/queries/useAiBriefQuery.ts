import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { AiProviderError, parsePartialBrief } from '@/api/aiProviders';
import { GeminiApiError } from '@/api/geminiApi';
import {
  aiBriefErrorMessage,
  aiBriefService,
  BriefProgress,
} from '@/services/aiBriefService';
import { queryClient as defaultClient, queryKeys } from '@/services/queryClient';
import { AiBrief } from '@/types/aiBrief';
import { Article } from '@/types/article';

const REVEAL_TICK_MS = 32;
const REVEAL_CHARS_PER_TICK = 1;

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 429]);

/**
 * Custom retry policy for the AI brief query. Returns true to retry, false to
 * give up. Rules:
 *   - Never retry an aborted request (the user navigated away or regenerated).
 *   - Cap retries at 1 (so total attempts = original + 1).
 *   - Never retry on non-retryable HTTP statuses (400/401/403/404/429) — bad
 *     keys and rate limits won't fix themselves on the next attempt and we'd
 *     just burn provider quota.
 */
const shouldRetryBrief = (failureCount: number, error: unknown): boolean => {
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  if (failureCount >= 1) return false;

  const status =
    error instanceof AiProviderError || error instanceof GeminiApiError
      ? error.status
      : undefined;

  if (status !== undefined && NON_RETRYABLE_STATUSES.has(status)) {
    return false;
  }
  return true;
};

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export type BriefDisplay = {
  isComplete: boolean;
  tldr: string;
  whyItMatters: string[];
};

/**
 * Drives the streaming AI brief on the article screen.
 *
 * Why this is more complex than a plain useQuery:
 * The AI provider streams raw text continuously, but we don't want to render
 * every chunk the moment it arrives — that produces visible jank and a feed
 * that races ahead of the eye. Instead we run a "reveal ticker" that drips
 * the streamed text out one character every REVEAL_TICK_MS, giving a typing
 * effect that's decoupled from network jitter.
 *
 * Refs (instead of state) hold the stream/reveal cursors because they update
 * on every tick; using state would force a re-render per character.
 *
 * The query promise only resolves once BOTH the stream has finished and the
 * reveal ticker has caught up to the full text — `revealComplete` is the
 * promise that gates this. That keeps `isLoading` true for the whole reveal,
 * so the UI can show a "thinking" indicator until the brief is fully visible.
 *
 * Returns the standard react-query result plus:
 *   - `display`: the BriefDisplay to render right now (streamed-partial or
 *     final), or null when no data exists yet.
 *   - `isStreaming`: true while the reveal is in progress.
 *   - `regenerate`: invalidates and refetches, used by the retry button.
 */
export function useAiBriefQuery(article: Article) {
  const client = useQueryClient();
  const [streaming, setStreaming] = useState<BriefProgress | null>(null);
  // Latest raw text accumulated from the stream — updated on every chunk.
  const rawRef = useRef('');
  // How many characters of `rawRef` have been "revealed" to the UI so far.
  const revealedLenRef = useRef(0);
  // Active setInterval handle for the reveal ticker, or null when idle.
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // True once the network stream has finished delivering all chunks.
  const streamFinishedRef = useRef(false);
  // Resolver for the promise the queryFn awaits before returning.
  const revealResolveRef = useRef<(() => void) | null>(null);

  /** Cancels and clears the reveal ticker if one is running. Safe to call
   * multiple times. */
  const stopTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  /**
   * Idempotent starter for the reveal ticker. Each tick advances the
   * revealed length by REVEAL_CHARS_PER_TICK and re-parses the partial
   * text into a `BriefProgress` so the UI can render whatever is "visible
   * so far". When the stream is finished AND the cursor has caught up,
   * the ticker stops itself and resolves the gate promise so the queryFn
   * can return.
   */
  const ensureTickerRunning = useCallback(() => {
    if (tickerRef.current !== null) return;
    tickerRef.current = setInterval(() => {
      const total = rawRef.current.length;
      if (revealedLenRef.current < total) {
        revealedLenRef.current = Math.min(
          revealedLenRef.current + REVEAL_CHARS_PER_TICK,
          total,
        );
        setStreaming(
          parsePartialBrief(rawRef.current.slice(0, revealedLenRef.current)),
        );
      }

      if (
        streamFinishedRef.current &&
        revealedLenRef.current >= rawRef.current.length
      ) {
        stopTicker();
        revealResolveRef.current?.();
        revealResolveRef.current = null;
      }
    }, REVEAL_TICK_MS);
  }, [stopTicker]);

  const query = useQuery<AiBrief, Error>({
    enabled: Boolean(article.id),
    queryKey: queryKeys.ai.brief(article.id),
    queryFn: async ({ signal }) => {
      rawRef.current = '';
      revealedLenRef.current = 0;
      streamFinishedRef.current = false;
      stopTicker();
      setStreaming({ tldr: '', whyItMatters: [] });

      const revealComplete = new Promise<void>((resolve) => {
        revealResolveRef.current = resolve;
      });

      const onAbort = () => {
        stopTicker();
        revealResolveRef.current?.();
        revealResolveRef.current = null;
      };
      signal.addEventListener('abort', onAbort);

      try {
        const result = await aiBriefService.generateBrief(article, {
          signal,
          onRawProgress: (rawText) => {
            rawRef.current = rawText;
            ensureTickerRunning();
          },
        });

        streamFinishedRef.current = true;
        ensureTickerRunning();
        await revealComplete;
        return result;
      } finally {
        signal.removeEventListener('abort', onAbort);
        stopTicker();
        setStreaming(null);
      }
    },
    retry: shouldRetryBrief,
    retryDelay: 8000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: ONE_HOUR,
    gcTime: ONE_DAY * 7,
  });

  const display: BriefDisplay | null = streaming
    ? { isComplete: false, ...streaming }
    : query.data
      ? {
          isComplete: true,
          tldr: query.data.tldr,
          whyItMatters: query.data.whyItMatters,
        }
      : null;

  /**
   * Forces a regenerate: invalidates the cached brief without auto-refetching
   * (refetchType: 'none'), then explicitly refetches so the streaming flow
   * runs fresh. Two-step is deliberate — letting react-query auto-refetch
   * would race with our refetch() and could trigger two streaming sessions.
   */
  const regenerate = useCallback(async () => {
    await client.invalidateQueries({
      queryKey: queryKeys.ai.brief(article.id),
      exact: true,
      refetchType: 'none',
    });
    return query.refetch();
  }, [article.id, client, query]);

  return {
    ...query,
    display,
    isStreaming: streaming !== null,
    regenerate,
  };
}

type AskInput = {
  article: Article;
  onRawProgress?: (rawText: string) => void;
  question: string;
};

/**
 * Mutation wrapper around `aiBriefService.askQuestion` for the "Ask AI"
 * input. Exposing this as a mutation (rather than a query) is intentional —
 * each ask is a discrete user action, not cached state, and we want
 * isPending/isSuccess for the send button UI.
 */
export function useAskAiMutation() {
  return useMutation({
    mutationFn: ({ article, onRawProgress, question }: AskInput) =>
      aiBriefService.askQuestion(article, question, { onRawProgress }),
  });
}

/**
 * Removes the cached brief for an article from the global query client.
 * Used when the article is bookmarked-then-unbookmarked, etc., where the
 * cache entry is no longer reachable from the UI but is still occupying
 * GC budget. Operates on the default client because it may be invoked
 * outside React render (e.g. event handlers, cleanup).
 */
export function clearAiBriefCache(articleId: string) {
  defaultClient.removeQueries({
    queryKey: queryKeys.ai.brief(articleId),
    exact: true,
  });
}

export { aiBriefErrorMessage };
