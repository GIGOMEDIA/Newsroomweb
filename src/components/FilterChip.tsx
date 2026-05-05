import { Pressable, StyleSheet, Text } from 'react-native';

import { fontFamily } from '@/utils/typography';

type FilterChipProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

export function FilterChip({ isSelected, label, onPress }: FilterChipProps) {
  return (
    <Pressable
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderColor: '#282B32',
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chipSelected: {
    backgroundColor: '#3A2024',
    borderColor: '#FF2635',
  },
  chipText: {
    color: '#9C9CA6',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  chipTextSelected: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
  },
});
