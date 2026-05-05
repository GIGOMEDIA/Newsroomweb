import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityCheckPanel } from '@/components/community/CommunityCheckPanel';
import { SupportingEvidencePanel } from '@/components/evidence/SupportingEvidencePanel';
import { NewsroomHeader } from '@/components/NewsroomHeader';
import {
  copyText,
  getContextPoint,
  useAppContextMenu,
} from '@/components/platform/AppContextMenu';
import {
  aiBriefErrorMessage,
  useAiBriefQuery,
  useAskAiMutation,
} from '@/hooks/queries/useAiBriefQuery';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import { useAppAuth } from '@/hooks/useAppAuth';
import { bookmarkService } from '@/services/bookmarkService';
import { Article } from '@/types/article';
import { getRelativePublishedTime } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

const AI_PROMPTS = [
  'Summarize this in one sentence.',
  "What's missing from the story?",
  'Who are the named sources?',
  'How could I verify this?',
];
const AI_ANSWER_REVEAL_TICK_MS = 24;

function formatPublishedStamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const datePart = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
  })
    .format(date)
    .toUpperCase();

  return `PUBLISHED ${datePart.toUpperCase()} • ${timePart}`;
}

export default function ArticleDetailsScreen() {
  const insets = useSafeAreaInsets();
  const layout = useAdaptiveLayout();
  const { showMenu } = useAppContextMenu();
  const params = useLocalSearchParams<{
    content?: string;
    description?: string;
    id?: string;
    imageUrl?: string;
    publishedAt?: string;
    source?: string;
    title?: string;
    url?: string;
  }>();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBriefOpen, setIsBriefOpen] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiQuestionError, setAiQuestionError] = useState<string | null>(null);
  const aiAnswerTargetRef = useRef('');
  const aiAnswerRevealedLenRef = useRef(0);
  const aiAnswerTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiAnswerFinishedRef = useRef(false);
  const aiAnswerRevealResolveRef = useRef<(() => void) | null>(null);
  const { isAuthenticated, isOffline, user } = useAppAuth();
  const goToSignIn = useCallback(() => {
    router.push('/auth/signin');
  }, []);

  const stopAiAnswerTicker = useCallback(() => {
    if (aiAnswerTickerRef.current !== null) {
      clearInterval(aiAnswerTickerRef.current);
      aiAnswerTickerRef.current = null;
    }
  }, []);

  const ensureAiAnswerTicker = useCallback(() => {
    if (aiAnswerTickerRef.current !== null) return;

    aiAnswerTickerRef.current = setInterval(() => {
      if (aiAnswerRevealedLenRef.current < aiAnswerTargetRef.current.length) {
        aiAnswerRevealedLenRef.current += 1;
        setAiAnswer(
          aiAnswerTargetRef.current.slice(0, aiAnswerRevealedLenRef.current),
        );
      }

      if (
        aiAnswerFinishedRef.current &&
        aiAnswerRevealedLenRef.current >= aiAnswerTargetRef.current.length
      ) {
        stopAiAnswerTicker();
        aiAnswerRevealResolveRef.current?.();
        aiAnswerRevealResolveRef.current = null;
      }
    }, AI_ANSWER_REVEAL_TICK_MS);
  }, [stopAiAnswerTicker]);

  useEffect(() => stopAiAnswerTicker, [stopAiAnswerTicker]);

  const article = useMemo<Article>(
    () => ({
      content: params.content ?? params.description ?? '',
      description: params.description ?? '',
      id: params.id ?? encodeURIComponent(params.url ?? params.title ?? ''),
      imageUrl: params.imageUrl || undefined,
      publishedAt: params.publishedAt ?? new Date().toISOString(),
      source: {
        name: params.source ?? 'NEWSROOM',
      },
      title: params.title ?? 'Untitled article',
      url: params.url ?? '',
    }),
    [params],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadBookmarkState = async () => {
        const bookmarked = await bookmarkService.isBookmarked(article.id);

        if (isActive) {
          setIsBookmarked(bookmarked);
        }
      };

      void loadBookmarkState();

      return () => {
        isActive = false;
      };
    }, [article.id]),
  );

  const toggleBookmark = useCallback(async () => {
    const nextBookmarks = await bookmarkService.toggleBookmark(article);
    setIsBookmarked(nextBookmarks.some((item) => item.id === article.id));
  }, [article]);

  const briefQuery = useAiBriefQuery(article);
  const askMutation = useAskAiMutation();

  const briefDisplay = briefQuery.display;
  const isBriefLoading = briefQuery.isFetching && !briefDisplay;
  const brief = briefQuery.data ?? null;
  const briefError = briefQuery.isError
    ? aiBriefErrorMessage(briefQuery.error)
    : undefined;
  const isAiAnswerLoading = askMutation.isPending;

  const regenerateBrief = useCallback(() => {
    void briefQuery.regenerate();
  }, [briefQuery]);

  useKeyboardShortcuts(
    useMemo(
      () => ({
        bookmark: toggleBookmark,
        refresh: regenerateBrief,
      }),
      [regenerateBrief, toggleBookmark],
    ),
  );

  const askArticleAi = useCallback(
    async (question = aiQuestion) => {
      const trimmedQuestion = question.trim();

      if (!isAuthenticated) {
        goToSignIn();
        return;
      }

      if (!trimmedQuestion) {
        setAiQuestionError('Ask a question first.');
        return;
      }

      if (isOffline) {
        setAiQuestionError('Reconnect to ask AI about this article.');
        return;
      }

      setAiQuestion(trimmedQuestion);
      setAiQuestionError(null);
      stopAiAnswerTicker();
      aiAnswerTargetRef.current = '';
      aiAnswerRevealedLenRef.current = 0;
      aiAnswerFinishedRef.current = false;
      setAiAnswer('');

      const revealComplete = new Promise<void>((resolve) => {
        aiAnswerRevealResolveRef.current = resolve;
      });

      try {
        const result = await askMutation.mutateAsync({
          article,
          onRawProgress: (rawText) => {
            aiAnswerTargetRef.current = rawText;
            ensureAiAnswerTicker();
          },
          question: trimmedQuestion,
        });
        aiAnswerTargetRef.current = result.answer;
        aiAnswerFinishedRef.current = true;
        ensureAiAnswerTicker();
        await revealComplete;
        setAiAnswer(result.answer);
      } catch (error) {
        stopAiAnswerTicker();
        aiAnswerRevealResolveRef.current = null;
        setAiQuestionError(aiBriefErrorMessage(error));
      }
    },
    [
      aiQuestion,
      article,
      askMutation,
      ensureAiAnswerTicker,
      goToSignIn,
      isAuthenticated,
      isOffline,
      stopAiAnswerTicker,
    ],
  );

  const openSource = useCallback(async () => {
    if (!article.url) {
      return;
    }
    await WebBrowser.openBrowserAsync(article.url);
  }, [article.url]);

  const shareArticle = useCallback(async () => {
    if (!article.url && !article.title) {
      return;
    }
    await Share.share({
      message: article.url
        ? `${article.title}\n${article.url}`
        : article.title,
      title: article.title,
    });
  }, [article.title, article.url]);

  const relativeTime = getRelativePublishedTime(article.publishedAt);
  const publishedStamp = formatPublishedStamp(article.publishedAt);
  const sourceHost = useMemo(() => {
    try {
      return new URL(article.url).host.replace(/^www\./, '');
    } catch {
      return article.source.name.toLowerCase();
    }
  }, [article.source.name, article.url]);

  const tldr =
    article.description ||
    'A short, plain-language summary will appear here once the AI brief is ready.';
  const bodyText =
    article.content && article.content !== article.description
      ? article.content
      : article.description;
  const screenContextProps =
    Platform.OS === 'web'
      ? ({
          onContextMenu: (event: unknown) => {
            const nativeEvent = event as { preventDefault?: () => void };
            nativeEvent.preventDefault?.();
            const point = getContextPoint(event);
            showMenu({
              ...point,
              items: [
                {
                  label: isBookmarked ? 'Remove from saved' : 'Save article',
                  onPress: toggleBookmark,
                },
                {
                  disabled: !article.url,
                  label: 'Copy source link',
                  onPress: () => void copyText(article.url),
                },
                { label: 'Refresh AI brief', onPress: regenerateBrief },
                { label: 'Back', onPress: () => router.back() },
              ],
            });
          },
        } as Record<string, unknown>)
      : {};

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View
        {...screenContextProps}
        style={[styles.screen, { paddingBottom: insets.bottom }]}
      >
        <NewsroomHeader />

        <KeyboardAwareScrollView
          bottomOffset={24}
          contentContainerStyle={[
            styles.scrollContent,
            layout.usesTopNav && styles.desktopScrollContent,
            { maxWidth: layout.contentMaxWidth },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backRow} onPress={() => router.back()}>
            <Feather color="#E6E6EA" name="arrow-left" size={14} />
            <Text style={styles.backLabel}>BACK</Text>
          </Pressable>

          <View style={styles.kickerRow}>
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>HOTNEWS</Text>
            </View>
            <Text style={styles.kickerMeta}>{relativeTime}</Text>
          </View>

          <Text style={styles.title}>{article.title}</Text>

          {article.description ? (
            <Text style={styles.subtitle}>{article.description}</Text>
          ) : null}

          {publishedStamp ? (
            <Text style={styles.publishedStamp}>{publishedStamp}</Text>
          ) : null}

          {article.imageUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: article.imageUrl }}
              style={[
                styles.heroImage,
                {
                  height: layout.isWide
                    ? 560
                    : layout.isMedium
                      ? 460
                      : 220,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.heroFallback,
                {
                  height: layout.isWide
                    ? 560
                    : layout.isMedium
                      ? 460
                      : 220,
                },
              ]}
            />
          )}

          <View style={styles.briefCard}>
            <Pressable
              style={styles.briefHeader}
              onPress={() => setIsBriefOpen((open) => !open)}
            >
              <View style={styles.briefHeaderLeft}>
                <Ionicons color="#F5C84B" name="sparkles" size={11} />
                <Text style={styles.briefHeaderTitle}>
                  AI BRIEF · 60-SECOND READ
                </Text>
              </View>
              <Feather
                color="#9A9AA3"
                name={isBriefOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
              />
            </Pressable>

            {isBriefOpen ? (
              <View style={styles.briefBody}>
                {briefDisplay ? (
                  <>
                    <Text style={styles.briefSectionLabel}>
                      <Text style={styles.briefSectionLabelAccent}>TLDR </Text>
                    </Text>
                    <Text style={styles.briefSectionText}>
                      {briefDisplay.tldr || '...'}
                      {!briefDisplay.isComplete && briefDisplay.tldr ? (
                        <Text style={styles.streamingCursor}>▍</Text>
                      ) : null}
                    </Text>

                    <Text style={styles.briefSectionLabel}>
                      <Text style={styles.briefSectionLabelAccent}>
                        WHY IT MATTERS
                      </Text>
                    </Text>
                    {briefDisplay.whyItMatters.length > 0 ? (
                      <View style={styles.bulletList}>
                        {briefDisplay.whyItMatters.map(
                          (bullet: string, index: number) => (
                            <BulletItem key={index} text={bullet} />
                          ),
                        )}
                      </View>
                    ) : !briefDisplay.isComplete ? (
                      <Text style={styles.briefStreamingHint}>
                        Building bullets…
                      </Text>
                    ) : null}

                    {briefDisplay.isComplete && briefError ? (
                      <Text style={styles.briefStaleNotice}>
                        Showing cached brief. {briefError}
                      </Text>
                    ) : null}
                  </>
                ) : isBriefLoading ? (
                  <View style={styles.briefLoading}>
                    <ActivityIndicator color="#F5C84B" size="small" />
                    <Text style={styles.briefLoadingText}>
                      Generating 60-second brief…
                    </Text>
                  </View>
                ) : briefError ? (
                  <Text style={styles.briefErrorText}>{briefError}</Text>
                ) : (
                  <Text style={styles.briefFallbackText}>{tldr}</Text>
                )}

                <View style={styles.briefFooter}>
                  <Text style={styles.briefFooterText}>
                    AI-generated. May contain errors. Powered by{' '}
                    {brief?.model ?? 'Gemini'}.
                  </Text>
                  <Pressable
                    disabled={isBriefLoading}
                    hitSlop={6}
                    onPress={regenerateBrief}
                  >
                    <Text
                      style={[
                        styles.briefFooterAction,
                        isBriefLoading && styles.briefFooterActionDisabled,
                      ]}
                    >
                      {isBriefLoading ? 'WORKING…' : 'REGENERATE'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {bodyText ? <Text style={styles.bodyText}>{bodyText}</Text> : null}

          <View style={styles.actionRow}>
            <Pressable style={styles.readButton} onPress={openSource}>
              <Feather color="#FFFFFF" name="external-link" size={12} />
              <Text style={styles.readButtonText}>READ FULL ARTICLE</Text>
            </Pressable>
            <Pressable style={styles.iconActionButton} onPress={toggleBookmark}>
              <Feather
                color={isBookmarked ? '#FF2635' : '#E6E6EA'}
                name="bookmark"
                size={12}
              />
              <Text style={styles.iconActionText}>SAVE</Text>
            </Pressable>
            <Pressable style={styles.iconActionButton} onPress={shareArticle}>
              <Feather color="#E6E6EA" name="share-2" size={12} />
              <Text style={styles.iconActionText}>SHARE</Text>
            </Pressable>
          </View>

          {article.url ? (
            <Pressable onPress={openSource}>
              <Text style={styles.sourceLink} numberOfLines={1}>
                Source: {sourceHost}
              </Text>
            </Pressable>
          ) : null}

          <SectionCard
            count="BETA"
            iconColor="#7BB7FF"
            iconName="message-circle"
            title="ASK AI ABOUT THIS ARTICLE"
          >
            <Text style={styles.sectionDescription}>
              The AI only has access to this article — it won&apos;t make up
              facts. Try:
            </Text>
            <View style={styles.promptList}>
              {AI_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  disabled={isAiAnswerLoading}
                  style={styles.promptChip}
                  onPress={() => askArticleAi(prompt)}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
            {isAuthenticated ? (
              <View style={styles.aiAskBox}>
                <TextInput
                  editable={!isAiAnswerLoading && !isOffline}
                  multiline
                  placeholder="Ask a question about this article..."
                  placeholderTextColor="#6E6E78"
                  selectionColor="#FF2635"
                  style={styles.aiInput}
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                />
                <Pressable
                  disabled={isAiAnswerLoading || isOffline}
                  style={[
                    styles.aiSubmitButton,
                    (isAiAnswerLoading || isOffline) &&
                      styles.aiSubmitButtonDisabled,
                  ]}
                  onPress={() => askArticleAi()}
                >
                  {isAiAnswerLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons color="#FFFFFF" name="sparkles" size={11} />
                      <Text style={styles.aiSubmitText}>ASK AI</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <AuthAction
                authedLabel="AI Q&A"
                isAuthenticated={isAuthenticated}
                isOffline={isOffline}
                signInLabel="Sign in to ask the AI"
                onSignIn={goToSignIn}
              />
            )}
            {isAuthenticated && isOffline ? (
              <Text style={styles.aiNotice}>
                You are offline. AI Q&A needs a connection.
              </Text>
            ) : null}
            {aiQuestionError ? (
              <Text style={styles.aiErrorText}>{aiQuestionError}</Text>
            ) : null}
            {aiAnswer ? (
              <View style={styles.aiAnswerBox}>
                <Text style={styles.aiAnswerLabel}>AI ANSWER</Text>
                <Text style={styles.aiAnswerText}>{aiAnswer}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionFootnote}>
              {isAuthenticated
                ? `Signed in as ${user?.email ?? 'your account'}. AI answers only use this article.`
                : 'AI Q&A coming soon. Stay sharp.'}
            </Text>
          </SectionCard>

          <SupportingEvidencePanel
            articleId={article.id}
            onSignInRequest={goToSignIn}
          />

          <CommunityCheckPanel
            articleId={article.id}
            onSignInRequest={goToSignIn}
          />
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

type AuthActionProps = {
  authedLabel: string;
  isAuthenticated: boolean;
  isOffline: boolean;
  signInLabel: string;
  onSignIn: () => void;
};

function AuthAction({
  authedLabel,
  isAuthenticated,
  isOffline,
  signInLabel,
  onSignIn,
}: AuthActionProps) {
  if (!isAuthenticated) {
    return (
      <Pressable style={styles.signInButton} onPress={onSignIn}>
        <Feather color="#A6A6AE" name="log-in" size={11} />
        <Text style={styles.signInText}>{signInLabel}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled
      style={[styles.signInButton, styles.signInButtonDisabled]}
    >
      <Feather
        color={isOffline ? '#F5C84B' : '#3BD27B'}
        name={isOffline ? 'wifi-off' : 'check-circle'}
        size={11}
      />
      <Text style={styles.signInText}>
        {isOffline ? 'Offline — ' : 'Signed in — '}
        {authedLabel} coming soon
      </Text>
    </Pressable>
  );
}

type SectionCardProps = {
  children: React.ReactNode;
  count: string;
  iconColor: string;
  iconName: React.ComponentProps<typeof Feather>['name'];
  title: string;
};

function SectionCard({
  children,
  count,
  iconColor,
  iconName,
  title,
}: SectionCardProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Feather color={iconColor} name={iconName} size={11} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  backLabel: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 9,
  },
  backRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
  },
  aiAnswerBox: {
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  aiAnswerLabel: {
    color: '#7BB7FF',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  aiAnswerText: {
    color: '#D5D5DB',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  aiAskBox: {
    backgroundColor: '#0A0C10',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  aiErrorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  aiInput: {
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    color: '#E6E6EA',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  aiNotice: {
    color: '#F5C84B',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  aiSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    flexDirection: 'row',
    gap: 7,
    height: 34,
    justifyContent: 'center',
    marginTop: 10,
  },
  aiSubmitButtonDisabled: {
    opacity: 0.6,
  },
  aiSubmitText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  bodyText: {
    color: '#C8C8CF',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 18,
  },
  briefBody: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  briefCard: {
    backgroundColor: '#0D0F13',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 18,
  },
  briefFooter: {
    alignItems: 'center',
    borderTopColor: '#1B1D22',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
  },
  briefErrorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  briefFallbackText: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  briefFooterAction: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  briefFooterActionDisabled: {
    color: '#5C5C66',
  },
  briefFooterText: {
    color: '#7B7B85',
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 8,
    paddingRight: 8,
  },
  briefLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingVertical: 14,
  },
  briefLoadingText: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  briefStaleNotice: {
    color: '#7B7B85',
    fontFamily: fontFamily.regular,
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 10,
  },
  briefStreamingHint: {
    color: '#7B7B85',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
  },
  streamingCursor: {
    color: '#F5C84B',
    fontFamily: fontFamily.bold,
  },
  briefHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 30,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  briefHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  briefHeaderTitle: {
    color: '#F5C84B',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  briefSectionLabel: {
    color: '#A4A4AD',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  briefSectionLabelAccent: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
  },
  briefSectionText: {
    color: '#D5D5DB',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  bulletDot: {
    backgroundColor: '#FF2635',
    height: 4,
    marginTop: 7,
    width: 4,
  },
  bulletList: {
    gap: 6,
    marginTop: 7,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletText: {
    color: '#C8C8CF',
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 17,
  },
  heroFallback: {
    backgroundColor: '#15171B',
    height: 190,
    marginTop: 16,
    width: '100%',
  },
  heroImage: {
    backgroundColor: '#15171B',
    height: 190,
    marginTop: 16,
    width: '100%',
  },
  hotBadge: {
    backgroundColor: '#FF2635',
    height: 16,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  hotBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  iconActionButton: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iconActionText: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  kickerMeta: {
    color: '#83838D',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  kickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  promptChip: {
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  promptChipText: {
    color: '#C8C8CF',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 13,
  },
  promptList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  publishedStamp: {
    color: '#6E6E78',
    fontFamily: fontFamily.medium,
    fontSize: 9,
    letterSpacing: 0.4,
    marginTop: 12,
  },
  readButton: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  readButtonText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  desktopScrollContent: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    width: '100%',
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionCard: {
    backgroundColor: '#0D0F13',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 18,
  },
  sectionCount: {
    color: '#83838D',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  sectionDescription: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  sectionFootnote: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 9,
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'center',
    borderBottomColor: '#1B1D22',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  sectionHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitle: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
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
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: '#C8C8CF',
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  sourceLink: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    marginTop: 14,
  },
  subtitle: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    marginTop: 12,
  },
  verdictDivider: {
    backgroundColor: '#1F2127',
    height: 14,
    width: 1,
  },
  verdictFake: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  verdictItem: {
    alignItems: 'center',
    flex: 1,
  },
  verdictReal: {
    color: '#3BD27B',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  verdictRow: {
    alignItems: 'center',
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    flexDirection: 'row',
    height: 36,
  },
});
