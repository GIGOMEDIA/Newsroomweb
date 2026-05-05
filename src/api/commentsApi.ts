import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/config/firestore';
import {
  Comment,
  CommentVerdict,
  VoteValue,
} from '@/types/comment';

type RawComment = {
  authorUid: string;
  authorEmail: string;
  authorVerified: boolean;
  text: string;
  verdict: CommentVerdict | null;
  createdAt: Timestamp | null;
  realVotes: number;
  fakeVotes: number;
};

const safeArticleId = (articleId: string) => encodeURIComponent(articleId);

const commentsCollection = (articleId: string) =>
  collection(db, 'articles', safeArticleId(articleId), 'comments');

const commentDoc = (articleId: string, commentId: string) =>
  doc(db, 'articles', safeArticleId(articleId), 'comments', commentId);

const voterDoc = (articleId: string, commentId: string, uid: string) =>
  doc(commentDoc(articleId, commentId), 'voters', uid);

const toComment = (
  id: string,
  raw: RawComment,
  myVote: VoteValue | null = null,
): Comment => ({
  authorEmail: raw.authorEmail,
  authorUid: raw.authorUid,
  authorVerified: raw.authorVerified ?? false,
  createdAt: raw.createdAt
    ? raw.createdAt.toDate().toISOString()
    : new Date().toISOString(),
  fakeVotes: raw.fakeVotes ?? 0,
  id,
  myVote,
  realVotes: raw.realVotes ?? 0,
  text: raw.text,
  verdict: raw.verdict ?? null,
});

export const commentsApi = {
  subscribe(
    articleId: string,
    callback: (comments: Comment[]) => void,
    onError?: (error: Error) => void,
  ) {
    const q = query(commentsCollection(articleId), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const comments = snapshot.docs.map((snap) =>
          toComment(snap.id, snap.data() as RawComment),
        );
        callback(comments);
      },
      (error) => onError?.(error),
    );
  },

  async hydrateMyVotes(
    articleId: string,
    comments: Comment[],
    uid: string,
  ): Promise<Comment[]> {
    const enriched = await Promise.all(
      comments.map(async (comment) => {
        try {
          const snap = await getDoc(voterDoc(articleId, comment.id, uid));
          if (!snap.exists()) {
            return { ...comment, myVote: null };
          }
          const data = snap.data() as { vote?: VoteValue };
          return { ...comment, myVote: data.vote ?? null };
        } catch {
          return comment;
        }
      }),
    );
    return enriched;
  },

  async postComment(
    articleId: string,
    payload: {
      authorUid: string;
      authorEmail: string;
      authorVerified: boolean;
      text: string;
      verdict: CommentVerdict | null;
    },
  ): Promise<string> {
    const ref = await addDoc(commentsCollection(articleId), {
      ...payload,
      createdAt: serverTimestamp(),
      fakeVotes: 0,
      realVotes: 0,
    });
    return ref.id;
  },

  async voteOnComment(
    articleId: string,
    commentId: string,
    uid: string,
    nextVote: VoteValue,
  ): Promise<{ myVote: VoteValue | null }> {
    const cRef = commentDoc(articleId, commentId);
    const vRef = voterDoc(articleId, commentId, uid);

    return runTransaction(db, async (transaction) => {
      const commentSnap = await transaction.get(cRef);
      if (!commentSnap.exists()) {
        throw new Error('Comment was removed.');
      }

      const voterSnap = await transaction.get(vRef);
      const previousVote = voterSnap.exists()
        ? ((voterSnap.data().vote ?? null) as VoteValue | null)
        : null;

      const finalVote: VoteValue | null =
        previousVote === nextVote ? null : nextVote;

      let realDelta = 0;
      let fakeDelta = 0;
      if (previousVote === 'real') realDelta -= 1;
      if (previousVote === 'fake') fakeDelta -= 1;
      if (finalVote === 'real') realDelta += 1;
      if (finalVote === 'fake') fakeDelta += 1;

      if (realDelta !== 0 || fakeDelta !== 0) {
        transaction.update(cRef, {
          fakeVotes: increment(fakeDelta),
          realVotes: increment(realDelta),
        });
      }

      if (finalVote === null) {
        transaction.delete(vRef);
      } else {
        transaction.set(vRef, {
          updatedAt: serverTimestamp(),
          vote: finalVote,
        });
      }

      return { myVote: finalVote };
    });
  },

  async clearVote(articleId: string, commentId: string, uid: string) {
    await deleteDoc(voterDoc(articleId, commentId, uid));
  },

  async setVoteRaw(
    articleId: string,
    commentId: string,
    uid: string,
    vote: VoteValue,
  ) {
    await setDoc(voterDoc(articleId, commentId, uid), {
      updatedAt: serverTimestamp(),
      vote,
    });
  },
};
