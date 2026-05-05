import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { fontFamily } from '@/utils/typography';

export function NewsroomHeader() {
  const layout = useAdaptiveLayout();

  if (layout.usesTopNav) {
    return null;
  }

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <View>
          <Text style={styles.brandName}>NEWSROOM</Text>
          <Text style={styles.brandSubline}>LIVE WIRE</Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <Feather color="#8E8E98" name="bell" size={14} />
        <View style={styles.logoutBox}>
          <Feather color="#A6A6AE" name="log-in" size={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandName: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  brandSubline: {
    color: '#A1A1AA',
    fontFamily: fontFamily.medium,
    fontSize: 5,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#191B20',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 41,
    justifyContent: 'space-between',
    paddingHorizontal: 7,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  logoBox: {
    alignItems: 'center',
    backgroundColor: '#F01F2D',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  logoText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 17,
  },
  logoutBox: {
    alignItems: 'center',
    borderColor: '#2B2D34',
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
});
