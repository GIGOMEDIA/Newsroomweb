import { Feather } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

import { getRelativePublishedTime } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

type StoryMetaProps = {
  clockSize?: number;
  publishedAt: string;
  source: string;
  sourceMaxWidth?: number;
  sourceStyle?: StyleProp<TextStyle>;
  timeStyle?: StyleProp<TextStyle>;
  variant?: 'compact' | 'regular' | 'lead';
};

export function StoryMeta({
  clockSize,
  publishedAt,
  source,
  sourceMaxWidth,
  sourceStyle,
  timeStyle,
  variant = 'regular',
}: StoryMetaProps) {
  const isLead = variant === 'lead';
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.row, isLead && styles.leadRow]}>
      <Text
        numberOfLines={1}
        style={[
          styles.source,
          isCompact && styles.compactSource,
          sourceMaxWidth ? { maxWidth: sourceMaxWidth } : null,
          sourceStyle,
        ]}
      >
        {source}
      </Text>
      <Text style={styles.separator}>•</Text>
      <Feather
        color="#85858F"
        name="clock"
        size={clockSize ?? (isLead ? 11 : isCompact ? 9 : 10)}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.time,
          isCompact && styles.compactTime,
          isLead && styles.leadTime,
          timeStyle,
        ]}
      >
        {getRelativePublishedTime(publishedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactSource: {
    fontSize: 6,
    maxWidth: 82,
  },
  compactTime: {
    fontSize: 6,
  },
  leadRow: {
    marginTop: 8,
  },
  leadTime: {
    fontSize: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  separator: {
    color: '#85858F',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  source: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 7,
    maxWidth: 144,
    textTransform: 'uppercase',
  },
  time: {
    color: '#85858F',
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
});
