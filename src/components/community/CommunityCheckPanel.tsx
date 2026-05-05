import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppAuth } from '@/hooks/useAppAuth';
import { commentsService } from '@/services/commentsService';
import {
  pendingActionsService,
  PendingAction,
  PendingComment,
} from '@/services/pendingActionsService';
import {
  Comment,
  CommentVerdict,
  VoteValue,
  computeStats,
} from '@/types/comment';
import { fontFamily } from '@/utils/typography';

import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import { VoteBar } from './VoteBar';

type CommunityCheckPanelProps = {
  articleId: string;
  onSignInRequest: () => void;
};

const buildOptimisticComment = (
  queueEntry: PendingComment,
): Comment => ({
  authorEmail: queueEntry.payload.authorEmail,
  authorUid: queueEntry.payload.authorUid,
  authorVerified: queueEntry.payload.authorVerified,
  createdAt: queueEntry.queuedAt,
  fakeVotes: 0,
  id: `pending:${queueEntry.id}`,
  myVote: null,
  pending: true,
  realVotes: 0,
  text: queueEntry.payload.text,
  verdict: queueEntry.payload.verdict,
});

const pendingCommentsFromQueue = (actions: PendingAction[]): Comment[] =>
  actions
    .filter((action): action is PendingComment => action.type === 'comment')
    .map(buildOptimisticComment);

export function CommunityCheckPanel({
  articleId,
  onSignInRequest,
}: CommunityCheckPanelProps) {
  const { isAuthenticated, isOffline, isOnline, user } = useAppAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const myVotesRef = useRef<Map<string, VoteValue | null>>(new Map());
  const hasHydratedVotesRef = useRef(false);

  const refreshPendingFromStorage = useCallback(async () => {
    const actions = await pendingActionsService.getForArticle(articleId);
    setPendingComments(pendingCommentsFromQueue(actions));
  }, [articleId]);

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      const [cached] = await Promise.all([
        commentsService.getCachedComments(articleId),
        refreshPendingFromStorage(),
      ]);

      if (!isActive) return;

      cached.forEach((comment) => {
        if (!myVotesRef.current.has(comment.id)) {
          myVotesRef.current.set(comment.id, comment.myVote ?? null);
        }
      });
      setComments(cached);
    };

    void hydrate();

    return () => {
      isActive = false;
    };
  }, [articleId, refreshPendingFromStorage]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const unsub = commentsService.subscribe(
      articleId,
      async (next) => {
        let merged: Comment[] = next.map((comment) => ({
          ...comment,
          myVote: myVotesRef.current.get(comment.id) ?? null,
        }));

        if (user && !hasHydratedVotesRef.current) {
          merged = await commentsService.hydrateMyVotes(
            articleId,
            merged,
            user.uid,
          );
          merged.forEach((comment) => {
            myVotesRef.current.set(comment.id, comment.myVote ?? null);
          });
          hasHydratedVotesRef.current = true;
        }

        setComments(merged);
        setSubscriptionError(null);
      },
      (error) => {
        setSubscriptionError(error.message);
      },
    );

    return () => {
      unsub();
    };
  }, [articleId, isOnline, user]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const replay = async () => {
      const result = await commentsService.replayPending();
      if (result.succeeded > 0 || result.failed > 0) {
        await refreshPendingFromStorage();
      }
    };

    void replay();
  }, [isOnline, refreshPendingFromStorage]);

  useEffect(() => {
    hasHydratedVotesRef.current = false;
    myVotesRef.current.clear();
  }, [user?.uid]);

  const handleSubmit = useCallback(
    async (text: string, verdict: CommentVerdict | null) => {
      if (!user || !user.email) {
        onSignInRequest();
        return;
      }

      setIsSubmitting(true);
      setSubmissionNotice(null);
      try {
        const result = await commentsService.postComment({
          articleId,
          isOnline,
          text,
          user: { email: user.email, uid: user.uid },
          verdict,
        });

        if (result.pending) {
          await refreshPendingFromStorage();
        }
        if (result.error) {
          setSubmissionNotice(
            `Saved locally, but cloud sync failed: ${result.error}`,
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [articleId, isOnline, onSignInRequest, refreshPendingFromStorage, user],
  );

  const handleVote = useCallback(
    async (commentId: string, nextVote: VoteValue) => {
      if (!user) {
        onSignInRequest();
        return;
      }

      const previousVote = myVotesRef.current.get(commentId) ?? null;
      const optimisticVote = previousVote === nextVote ? null : nextVote;

      myVotesRef.current.set(commentId, optimisticVote);
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId
            ? { ...comment, myVote: optimisticVote }
            : comment,
        ),
      );

      setVotingId(commentId);
      try {
        const result = await commentsService.voteOnComment({
          articleId,
          commentId,
          isOnline,
          nextVote,
          user: { uid: user.uid },
        });

        myVotesRef.current.set(commentId, result.myVote);
        setComments((current) =>
          current.map((comment) =>
            comment.id === commentId
              ? { ...comment, myVote: result.myVote }
              : comment,
          ),
        );

        if (result.pending) {
          await refreshPendingFromStorage();
        }
      } catch {
        myVotesRef.current.set(commentId, previousVote);
        setComments((current) =>
          current.map((comment) =>
            comment.id === commentId
              ? { ...comment, myVote: previousVote }
              : comment,
          ),
        );
      } finally {
        setVotingId(null);
      }
    },
    [articleId, isOnline, onSignInRequest, refreshPendingFromStorage, user],
  );

  const allComments = [...pendingComments, ...comments];
  const stats = computeStats(allComments);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather color="#3BD27B" name="users" size={11} />
          <Text style={styles.title}>COMMUNITY CHECK</Text>
        </View>
        <Text style={styles.count}>
          {stats.commentCount} COMMENT
          {stats.commentCount === 1 ? '' : 'S'}
        </Text>
      </View>

      <View style={styles.headerBar}>
        <VoteBar
          fakePercent={stats.fakePercent}
          realPercent={stats.realPercent}
          totalVotes={stats.totalVotes}
        />
      </View>

      {!isAuthenticated ? (
        <View style={styles.body}>
          <Pressable style={styles.signInButton} onPress={onSignInRequest}>
            <Feather color="#A6A6AE" name="log-in" size={11} />
            <Text style={styles.signInText}>
              Sign in to post a comment or fact-check
            </Text>
          </Pressable>
          <Text style={styles.footnote}>Be the first to weigh in.</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <CommentComposer
            isOffline={isOffline}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />

          {subscriptionError ? (
            <Text style={styles.errorText}>{subscriptionError}</Text>
          ) : null}
          {submissionNotice ? (
            <Text style={styles.errorText}>{submissionNotice}</Text>
          ) : null}

          {allComments.length === 0 ? (
            <Text style={styles.emptyText}>
              No comments yet. Be the first to weigh in.
            </Text>
          ) : (
            <View style={styles.commentList}>
              {allComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  isOffline={isOffline}
                  isVoting={votingId === comment.id}
                  onVote={handleVote}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#0D0F13',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 18,
  },
  commentList: {
    marginTop: 14,
  },
  count: {
    color: '#83838D',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  emptyText: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  footnote: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 9,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#1B1D22',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  signInButton: {
    alignItems: 'center',
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 34,
    justifyContent: 'center',
    marginTop: 12,
  },
  signInText: {
    color: '#C8C8CF',
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  title: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
});
