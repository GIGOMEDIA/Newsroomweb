import { evidenceApi } from '@/api/evidenceApi';
import { Evidence, MAX_IMAGE_BYTES } from '@/types/evidence';
import { withTimeout } from '@/utils/async';

import { cacheService } from './cacheService';
import {
  pendingActionsService,
  PendingEvidenceImage,
  PendingEvidenceLink,
  PendingEvidenceNote,
} from './pendingActionsService';
import { userProfileService } from './userProfileService';

/** Per-article cache key for evidence lists. */
const cacheKey = (articleId: string) => `evidence:${articleId}`;
const WRITE_TIMEOUT_MS = 15000;
/** Image uploads need a longer ceiling than text writes — Storage uploads are
 * I/O bound on slow networks even for small files. */
const IMAGE_UPLOAD_TIMEOUT_MS = 25000;

/** Normalizes any thrown value into a short user-facing string. */
const toMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not reach the evidence service.';
};

type AuthorContext = {
  uid: string;
  email: string;
};

/** Resolves the author block stamped onto every evidence write. We pull
 * `verified` from the user profile so verified contributions display the
 * badge even when their profile doc is later edited. */
const buildAuthor = async (user: AuthorContext) => {
  const profile = await userProfileService.getProfile(user.uid);
  return {
    authorEmail: user.email,
    authorUid: user.uid,
    authorVerified: profile.verified,
  };
};

export const evidenceService = {
  /** Reads the cached evidence list for instant render while the live
   * subscription connects. */
  async getCachedEvidence(articleId: string): Promise<Evidence[]> {
    const cached = await cacheService.get<Evidence[]>(cacheKey(articleId));
    return cached?.data ?? [];
  },

  /**
   * Subscribes to live evidence updates and mirrors each emission into the
   * cache. Returns the unsubscribe function provided by the API layer.
   */
  subscribe(
    articleId: string,
    callback: (items: Evidence[]) => void,
    onError?: (error: Error) => void,
  ) {
    return evidenceApi.subscribe(
      articleId,
      (items) => {
        callback(items);
        void cacheService.set(cacheKey(articleId), items);
      },
      onError,
    );
  },

  /**
   * Submits a URL-based piece of evidence. Validates that a URL is actually
   * present (after trim), then follows the standard offline-first flow:
   * queue when offline, attempt with timeout when online, queue on failure.
   */
  async postLink({
    articleId,
    user,
    url,
    caption,
    isOnline,
  }: {
    articleId: string;
    user: AuthorContext;
    url: string;
    caption: string;
    isOnline: boolean;
  }): Promise<{ pending: boolean; queueId?: string; error?: string }> {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return { error: 'Add a URL first.', pending: false };
    }

    const author = await buildAuthor(user);
    const payload = {
      ...author,
      caption: caption.trim(),
      url: trimmedUrl,
    };

    if (!isOnline) {
      const queued = await pendingActionsService.enqueueEvidenceLink({
        articleId,
        payload,
      });
      return { pending: true, queueId: queued.id };
    }

    try {
      await withTimeout(
        evidenceApi.postLink(articleId, payload),
        WRITE_TIMEOUT_MS,
      );
      return { pending: false };
    } catch (error) {
      const queued = await pendingActionsService.enqueueEvidenceLink({
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
   * Submits a text-only evidence note. Empty captions (after trim) are
   * rejected; otherwise standard offline-first flow.
   */
  async postNote({
    articleId,
    user,
    caption,
    isOnline,
  }: {
    articleId: string;
    user: AuthorContext;
    caption: string;
    isOnline: boolean;
  }): Promise<{ pending: boolean; queueId?: string; error?: string }> {
    const trimmed = caption.trim();
    if (!trimmed) {
      return { error: 'Note cannot be empty.', pending: false };
    }

    const author = await buildAuthor(user);
    const payload = { ...author, caption: trimmed };

    if (!isOnline) {
      const queued = await pendingActionsService.enqueueEvidenceNote({
        articleId,
        payload,
      });
      return { pending: true, queueId: queued.id };
    }

    try {
      await withTimeout(
        evidenceApi.postNote(articleId, payload),
        WRITE_TIMEOUT_MS,
      );
      return { pending: false };
    } catch (error) {
      const queued = await pendingActionsService.enqueueEvidenceNote({
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
   * Submits an image-based evidence item. Two pre-checks run before any
   * network/queue work:
   *   - A local URI must be supplied.
   *   - If the picker reported a fileSize, reject anything larger than the
   *     2MB ceiling (`MAX_IMAGE_BYTES`) before attempting upload, so the
   *     user gets immediate feedback instead of a slow 25s timeout failure.
   *
   * Beyond that, identical offline-first flow with a longer timeout window.
   */
  async postImage({
    articleId,
    user,
    localUri,
    fileSize,
    caption,
    isOnline,
  }: {
    articleId: string;
    user: AuthorContext;
    localUri: string;
    fileSize?: number;
    caption: string;
    isOnline: boolean;
  }): Promise<{ pending: boolean; queueId?: string; error?: string }> {
    if (!localUri) {
      return { error: 'Pick an image first.', pending: false };
    }

    if (typeof fileSize === 'number' && fileSize > MAX_IMAGE_BYTES) {
      return {
        error: 'Image is over 2 MB. Pick a smaller one.',
        pending: false,
      };
    }

    const author = await buildAuthor(user);
    const payload = {
      ...author,
      caption: caption.trim(),
      localUri,
    };

    if (!isOnline) {
      const queued = await pendingActionsService.enqueueEvidenceImage({
        articleId,
        payload,
      });
      return { pending: true, queueId: queued.id };
    }

    try {
      await withTimeout(
        evidenceApi.uploadImage(articleId, payload),
        IMAGE_UPLOAD_TIMEOUT_MS,
      );
      return { pending: false };
    } catch (error) {
      const queued = await pendingActionsService.enqueueEvidenceImage({
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
   * Deletes an evidence item. If `storagePath` is supplied, the API layer
   * also removes the underlying Storage object; pass it for image evidence
   * but not for links/notes.
   */
  async remove(
    articleId: string,
    evidenceId: string,
    storagePath?: string,
  ): Promise<void> {
    await evidenceApi.remove(articleId, evidenceId, storagePath);
  },

  /**
   * Drains queued evidence actions (link/note/image) by routing each to the
   * matching API call. Comment/vote actions in the same queue are left to
   * `commentsService.replayPending`.
   */
  async replayPending(): Promise<{ succeeded: number; failed: number }> {
    return pendingActionsService.replay({
      async evidenceImage(action: PendingEvidenceImage) {
        await evidenceApi.uploadImage(action.articleId, action.payload);
      },
      async evidenceLink(action: PendingEvidenceLink) {
        await evidenceApi.postLink(action.articleId, action.payload);
      },
      async evidenceNote(action: PendingEvidenceNote) {
        await evidenceApi.postNote(action.articleId, action.payload);
      },
    });
  },
};
