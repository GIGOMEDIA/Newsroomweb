import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Evidence } from '@/types/evidence';
import { getRelativePublishedTime } from '@/utils/date';
import { fontFamily } from '@/utils/typography';

type EvidenceCardProps = {
  canDelete: boolean;
  evidence: Evidence;
  isOffline: boolean;
  onDelete: (evidence: Evidence) => void;
};

const displayName = (email: string) => {
  const handle = email.split('@')[0];
  return handle || email;
};

const hostFromUrl = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export function EvidenceCard({
  canDelete,
  evidence,
  isOffline,
  onDelete,
}: EvidenceCardProps) {
  const openLink = async () => {
    if (!evidence.url) return;
    await WebBrowser.openBrowserAsync(evidence.url);
  };

  const imageSource = evidence.localUri ?? evidence.url;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.typeBadge,
              evidence.type === 'link' && styles.typeBadgeLink,
              evidence.type === 'image' && styles.typeBadgeImage,
              evidence.type === 'note' && styles.typeBadgeNote,
            ]}
          >
            <Feather
              color="#FFFFFF"
              name={
                evidence.type === 'link'
                  ? 'link'
                  : evidence.type === 'image'
                    ? 'image'
                    : 'edit-3'
              }
              size={9}
            />
            <Text style={styles.typeBadgeText}>
              {evidence.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.author}>{displayName(evidence.authorEmail)}</Text>
          {evidence.authorVerified ? (
            <View style={styles.verifiedBadge}>
              <Feather color="#3BD27B" name="check" size={8} />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.time}>
          {evidence.pending
            ? isOffline
              ? 'OFFLINE'
              : 'SYNCING'
            : getRelativePublishedTime(evidence.createdAt)}
        </Text>
      </View>

      {evidence.type === 'image' && imageSource ? (
        <Image
          contentFit="cover"
          source={{ uri: imageSource }}
          style={styles.image}
        />
      ) : null}

      {evidence.type === 'link' && evidence.url ? (
        <Pressable style={styles.linkRow} onPress={openLink}>
          <Feather color="#7BB7FF" name="external-link" size={11} />
          <Text style={styles.linkText} numberOfLines={2}>
            {hostFromUrl(evidence.url)}
          </Text>
        </Pressable>
      ) : null}

      {evidence.caption ? (
        <Text style={styles.caption}>{evidence.caption}</Text>
      ) : null}

      {canDelete && !evidence.pending ? (
        <Pressable
          hitSlop={6}
          style={styles.deleteButton}
          onPress={() => onDelete(evidence)}
        >
          <Feather color="#FF8893" name="trash-2" size={10} />
          <Text style={styles.deleteText}>DELETE</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  author: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  caption: {
    color: '#C8C8CF',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#0A0C10',
    borderColor: '#15171B',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  deleteText: {
    color: '#FF8893',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
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
  image: {
    aspectRatio: 16 / 10,
    backgroundColor: '#15171B',
    marginTop: 10,
    width: '100%',
  },
  linkRow: {
    alignItems: 'center',
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkText: {
    color: '#7BB7FF',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  time: {
    color: '#6E6E78',
    fontFamily: fontFamily.medium,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  typeBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    height: 16,
    paddingHorizontal: 5,
  },
  typeBadgeImage: {
    backgroundColor: 'rgba(245, 200, 75, 0.4)',
  },
  typeBadgeLink: {
    backgroundColor: 'rgba(123, 183, 255, 0.4)',
  },
  typeBadgeNote: {
    backgroundColor: 'rgba(170, 170, 180, 0.3)',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.4,
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
});
