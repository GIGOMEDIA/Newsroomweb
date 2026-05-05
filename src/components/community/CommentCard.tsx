import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Comment, VoteValue } from '@/types/comment';
import { getRelativePublishedTime } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

import { VoteBar } from './VoteBar';

type CommentCardProps = {
  comment: Comment;
  isOffline: boolean;
  isVoting: boolean;
  onVote: (commentId: string, vote: VoteValue) => void;
};

const displayName = (email: string) => {
  const handle = email.split('@')[0];
  return handle || email;
};

export function CommentCard({
  comment,
  isOffline,
  isVoting,
  onVote,
}: CommentCardProps) {
  const totalVotes = comment.realVotes + comment.fakeVotes;
  const realPercent = totalVotes
    ? Math.round((comment.realVotes / totalVotes) * 100)
    : 0;
  const fakePercent = totalVotes ? 100 - realPercent : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.author}>{displayName(comment.authorEmail)}</Text>
          {comment.authorVerified ? (
            <View style={styles.verifiedBadge}>
              <Feather color="#3BD27B" name="check" size={8} />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          ) : null}
          {comment.verdict ? (
            <View
              style={[
                styles.verdictBadge,
                comment.verdict === 'fact'
                  ? styles.verdictBadgeFact
                  : styles.verdictBadgeFake,
              ]}
            >
              <Text style={styles.verdictBadgeText}>
                {comment.verdict.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.time}>
          {comment.pending
            ? 'PENDING'
            : getRelativePublishedTime(comment.createdAt)}
        </Text>
      </View>

      <Text style={styles.body}>{comment.text}</Text>

      <VoteBar
        fakePercent={fakePercent}
        realPercent={realPercent}
        size="compact"
        totalVotes={totalVotes}
      />

      <View style={styles.actionRow}>
        <Pressable
          disabled={isVoting || comment.pending}
          style={[
            styles.voteButton,
            comment.myVote === 'real' && styles.voteButtonRealActive,
          ]}
          onPress={() => onVote(comment.id, 'real')}
        >
          <Feather
            color={comment.myVote === 'real' ? '#3BD27B' : '#A4A4AD'}
            name="thumbs-up"
            size={11}
          />
          <Text
            style={[
              styles.voteButtonText,
              comment.myVote === 'real' && styles.voteButtonTextRealActive,
            ]}
          >
            REAL
          </Text>
        </Pressable>

        <Pressable
          disabled={isVoting || comment.pending}
          style={[
            styles.voteButton,
            comment.myVote === 'fake' && styles.voteButtonFakeActive,
          ]}
          onPress={() => onVote(comment.id, 'fake')}
        >
          <Feather
            color={comment.myVote === 'fake' ? '#FF2635' : '#A4A4AD'}
            name="thumbs-down"
            size={11}
          />
          <Text
            style={[
              styles.voteButtonText,
              comment.myVote === 'fake' && styles.voteButtonTextFakeActive,
            ]}
          >
            FAKE
          </Text>
        </Pressable>

        {comment.pending ? (
          <View style={styles.pendingBadge}>
            <Feather color="#F5C84B" name="clock" size={9} />
            <Text style={styles.pendingBadgeText}>
              {isOffline ? 'OFFLINE' : 'SYNCING'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  author: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  body: {
    color: '#D5D5DB',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  card: {
    backgroundColor: '#0A0C10',
    borderColor: '#15171B',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  pendingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 200, 75, 0.1)',
    borderColor: 'rgba(245, 200, 75, 0.4)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 22,
    marginLeft: 'auto',
    paddingHorizontal: 7,
  },
  pendingBadgeText: {
    color: '#F5C84B',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  time: {
    color: '#6E6E78',
    fontFamily: fontFamily.medium,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  verdictBadge: {
    height: 16,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  verdictBadgeFact: {
    backgroundColor: 'rgba(59, 210, 123, 0.15)',
  },
  verdictBadgeFake: {
    backgroundColor: 'rgba(255, 38, 53, 0.15)',
  },
  verdictBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 210, 123, 0.12)',
    flexDirection: 'row',
    gap: 3,
    height: 16,
    paddingHorizontal: 5,
  },
  verifiedText: {
    color: '#3BD27B',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  voteButton: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 26,
    paddingHorizontal: 9,
  },
  voteButtonFakeActive: {
    backgroundColor: 'rgba(255, 38, 53, 0.12)',
    borderColor: '#FF2635',
  },
  voteButtonRealActive: {
    backgroundColor: 'rgba(59, 210, 123, 0.12)',
    borderColor: '#3BD27B',
  },
  voteButtonText: {
    color: '#A4A4AD',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  voteButtonTextFakeActive: {
    color: '#FF2635',
  },
  voteButtonTextRealActive: {
    color: '#3BD27B',
  },
});
