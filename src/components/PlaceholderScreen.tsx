import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontFamily } from '@/utils/typography';

type PlaceholderScreenProps = {
  label: string;
};

export function PlaceholderScreen({ label }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>NEWSROOM</Text>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.copy}>This section is ready for implementation.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: '#8B8B96',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 10,
  },
  eyebrow: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    marginBottom: 8,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 28,
  },
});
