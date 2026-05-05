import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppAuth } from '@/hooks/useAppAuth';
import { evidenceService } from '@/services/evidenceService';
import {
  pendingActionsService,
  PendingAction,
  PendingEvidenceImage,
  PendingEvidenceLink,
  PendingEvidenceNote,
} from '@/services/pendingActionsService';
import { Evidence } from '@/types/evidence';
import { fontFamily } from '@/utils/typography';

import { EvidenceCard } from './EvidenceCard';
import { EvidenceComposer } from './EvidenceComposer';

type SupportingEvidencePanelProps = {
  articleId: string;
  onSignInRequest: () => void;
};

const isEvidenceAction = (
  action: PendingAction,
): action is PendingEvidenceLink | PendingEvidenceNote | PendingEvidenceImage =>
  action.type === 'evidence-link' ||
  action.type === 'evidence-note' ||
  action.type === 'evidence-image';

const buildOptimisticEvidence = (
  action: PendingEvidenceLink | PendingEvidenceNote | PendingEvidenceImage,
): Evidence => {
  const base = {
    authorEmail: action.payload.authorEmail,
    authorUid: action.payload.authorUid,
    authorVerified: action.payload.authorVerified,
    caption: action.payload.caption,
    createdAt: action.queuedAt,
    id: `pending:${action.id}`,
    pending: true,
  };

  if (action.type === 'evidence-link') {
    return { ...base, type: 'link', url: action.payload.url };
  }
  if (action.type === 'evidence-image') {
    return {
      ...base,
      localUri: action.payload.localUri,
      type: 'image',
      url: action.payload.localUri,
    };
  }
  return { ...base, type: 'note' };
};

export function SupportingEvidencePanel({
  articleId,
  onSignInRequest,
}: SupportingEvidencePanelProps) {
  const { isAuthenticated, isOffline, isOnline, user } = useAppAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [pending, setPending] = useState<Evidence[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );

  const refreshPendingFromStorage = useCallback(async () => {
    const actions = await pendingActionsService.getForArticle(articleId);
    setPending(actions.filter(isEvidenceAction).map(buildOptimisticEvidence));
  }, [articleId]);

  useEffect(() => {
    let isActive = true;
    const hydrate = async () => {
      const cached = await evidenceService.getCachedEvidence(articleId);
      if (!isActive) return;
      setEvidence(cached);
      await refreshPendingFromStorage();
    };
    void hydrate();
    return () => {
      isActive = false;
    };
  }, [articleId, refreshPendingFromStorage]);

  useEffect(() => {
    if (!isOnline) return;

    const unsub = evidenceService.subscribe(
      articleId,
      (items) => {
        setEvidence(items);
        setSubscriptionError(null);
      },
      (error) => setSubscriptionError(error.message),
    );

    return () => {
      unsub();
    };
  }, [articleId, isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    const replay = async () => {
      const result = await evidenceService.replayPending();
      if (result.succeeded > 0 || result.failed > 0) {
        await refreshPendingFromStorage();
      }
    };
    void replay();
  }, [isOnline, refreshPendingFromStorage]);

  const handleSubmitLink = useCallback(
    async (url: string, caption: string) => {
      if (!user || !user.email) {
        onSignInRequest();
        return;
      }
      setIsSubmitting(true);
      setSubmissionNotice(null);
      try {
        const result = await evidenceService.postLink({
          articleId,
          caption,
          isOnline,
          url,
          user: { email: user.email, uid: user.uid },
        });
        if (result.error && !result.pending) {
          throw new Error(result.error);
        }
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

  const handleSubmitNote = useCallback(
    async (caption: string) => {
      if (!user || !user.email) {
        onSignInRequest();
        return;
      }
      setIsSubmitting(true);
      setSubmissionNotice(null);
      try {
        const result = await evidenceService.postNote({
          articleId,
          caption,
          isOnline,
          user: { email: user.email, uid: user.uid },
        });
        if (result.error && !result.pending) {
          throw new Error(result.error);
        }
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

  const handleSubmitImage = useCallback(
    async (
      image: { uri: string; fileSize?: number },
      caption: string,
    ) => {
      if (!user || !user.email) {
        onSignInRequest();
        return;
      }
      setIsSubmitting(true);
      setSubmissionNotice(null);
      try {
        const result = await evidenceService.postImage({
          articleId,
          caption,
          fileSize: image.fileSize,
          isOnline,
          localUri: image.uri,
          user: { email: user.email, uid: user.uid },
        });
        if (result.error && !result.pending) {
          throw new Error(result.error);
        }
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

  const handleDelete = useCallback(
    (item: Evidence) => {
      Alert.alert('Delete evidence?', 'This cannot be undone.', [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: async () => {
            try {
              await evidenceService.remove(
                articleId,
                item.id,
                item.storagePath,
              );
            } catch (error) {
              Alert.alert(
                'Could not delete',
                error instanceof Error ? error.message : 'Unknown error',
              );
            }
          },
          style: 'destructive',
          text: 'Delete',
        },
      ]);
    },
    [articleId],
  );

  const allItems = [...pending, ...evidence];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather color="#F5C84B" name="paperclip" size={11} />
          <Text style={styles.title}>SUPPORTING EVIDENCE</Text>
        </View>
        <Text style={styles.count}>
          {allItems.length} ITEM{allItems.length === 1 ? '' : 'S'}
        </Text>
      </View>

      {!isAuthenticated ? (
        <View style={styles.body}>
          <Pressable style={styles.signInButton} onPress={onSignInRequest}>
            <Feather color="#A6A6AE" name="log-in" size={11} />
            <Text style={styles.signInText}>
              Sign in to add supporting facts
            </Text>
          </Pressable>
          <Text style={styles.footnote}>
            No evidence yet. Be the first to add a source, image, or note.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <EvidenceComposer
            isOffline={isOffline}
            isSubmitting={isSubmitting}
            onSubmitImage={handleSubmitImage}
            onSubmitLink={handleSubmitLink}
            onSubmitNote={handleSubmitNote}
          />

          {subscriptionError ? (
            <Text style={styles.errorText}>{subscriptionError}</Text>
          ) : null}
          {submissionNotice ? (
            <Text style={styles.errorText}>{submissionNotice}</Text>
          ) : null}

          {allItems.length === 0 ? (
            <Text style={styles.emptyText}>
              No evidence yet. Be the first to add a source, image, or note.
            </Text>
          ) : (
            <View style={styles.list}>
              {allItems.map((item) => (
                <EvidenceCard
                  key={item.id}
                  canDelete={item.authorUid === user?.uid}
                  evidence={item}
                  isOffline={isOffline}
                  onDelete={handleDelete}
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
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  list: {
    marginTop: 14,
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
