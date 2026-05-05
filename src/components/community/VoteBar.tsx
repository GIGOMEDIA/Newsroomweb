import { StyleSheet, Text, View } from 'react-native';

import { fontFamily } from '@/utils/typography';

type VoteBarProps = {
  fakePercent: number;
  realPercent: number;
  size?: 'compact' | 'full';
  totalVotes?: number;
};

export function VoteBar({
  fakePercent,
  realPercent,
  size = 'full',
  totalVotes,
}: VoteBarProps) {
  const isCompact = size === 'compact';
  const hasVotes = realPercent + fakePercent > 0;

  return (
    <View style={styles.container}>
      <View
        style={[styles.track, isCompact ? styles.trackCompact : styles.trackFull]}
      >
        {hasVotes ? (
          <>
            <View
              style={[styles.realFill, { flexBasis: `${realPercent}%` }]}
            />
            <View
              style={[styles.fakeFill, { flexBasis: `${fakePercent}%` }]}
            />
          </>
        ) : null}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.realLabel}>{realPercent}% REAL</Text>
        {typeof totalVotes === 'number' ? (
          <Text style={styles.countLabel}>
            {totalVotes} VOTE{totalVotes === 1 ? '' : 'S'}
          </Text>
        ) : null}
        <Text style={styles.fakeLabel}>{fakePercent}% FAKE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  countLabel: {
    color: '#83838D',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  fakeFill: {
    backgroundColor: '#FF2635',
    height: '100%',
  },
  fakeLabel: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  realFill: {
    backgroundColor: '#3BD27B',
    height: '100%',
  },
  realLabel: {
    color: '#3BD27B',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  track: {
    backgroundColor: '#1B1D22',
    borderRadius: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  trackCompact: {
    height: 4,
  },
  trackFull: {
    height: 6,
  },
});
