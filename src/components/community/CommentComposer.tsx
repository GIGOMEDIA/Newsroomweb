import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CommentVerdict } from '@/types/comment';
import { fontFamily } from '@/utils/typography';

type CommentComposerProps = {
  isOffline: boolean;
  isSubmitting: boolean;
  onSubmit: (text: string, verdict: CommentVerdict | null) => Promise<void>;
};

export function CommentComposer({
  isOffline,
  isSubmitting,
  onSubmit,
}: CommentComposerProps) {
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<CommentVerdict | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    setLocalError(null);
    if (!canSubmit) {
      return;
    }
    try {
      await onSubmit(trimmed, verdict);
      setText('');
      setVerdict(null);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : 'Could not post comment.',
      );
    }
  };

  const toggleVerdict = (value: CommentVerdict) => {
    setVerdict((current) => (current === value ? null : value));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          editable={!isSubmitting}
          multiline
          placeholder="Add a comment, source, or a fact-check..."
          placeholderTextColor="#6E6E78"
          style={styles.input}
          value={text}
          onChangeText={setText}
        />
        <Pressable
          accessibilityLabel="Post comment"
          disabled={!canSubmit}
          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Feather color="#FFFFFF" name="send" size={13} />
          )}
        </Pressable>
      </View>

      <View style={styles.verdictRow}>
        <View style={styles.verdictHint}>
          <Feather color="#6E6E78" name="tag" size={10} />
          <Text style={styles.verdictHintText}>
            Optional: tag your claim
          </Text>
        </View>
        <View style={styles.verdictButtons}>
          <Pressable
            disabled={isSubmitting}
            style={[
              styles.verdictPill,
              verdict === 'fact' && styles.verdictPillFactActive,
            ]}
            onPress={() => toggleVerdict('fact')}
          >
            <Text
              style={[
                styles.verdictPillText,
                verdict === 'fact' && styles.verdictPillTextActive,
              ]}
            >
              FACT
            </Text>
          </Pressable>
          <Pressable
            disabled={isSubmitting}
            style={[
              styles.verdictPill,
              verdict === 'fake' && styles.verdictPillFakeActive,
            ]}
            onPress={() => toggleVerdict('fake')}
          >
            <Text
              style={[
                styles.verdictPillText,
                verdict === 'fake' && styles.verdictPillTextActive,
              ]}
            >
              FAKE
            </Text>
          </Pressable>
        </View>
      </View>

      {isOffline ? (
        <Text style={styles.offlineNote}>
          You&apos;re offline. Your comment will sync when you reconnect.
        </Text>
      ) : null}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  input: {
    color: '#E6E6EA',
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    maxHeight: 90,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputRow: {
    alignItems: 'flex-end',
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    flexDirection: 'row',
  },
  offlineNote: {
    color: '#F5C84B',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  verdictButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  verdictHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  verdictHintText: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 9,
  },
  verdictPill: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  verdictPillFactActive: {
    backgroundColor: 'rgba(59, 210, 123, 0.12)',
    borderColor: '#3BD27B',
  },
  verdictPillFakeActive: {
    backgroundColor: 'rgba(255, 38, 53, 0.12)',
    borderColor: '#FF2635',
  },
  verdictPillText: {
    color: '#A4A4AD',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  verdictPillTextActive: {
    color: '#FFFFFF',
  },
  verdictRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  wrapper: {
    width: '100%',
  },
});
