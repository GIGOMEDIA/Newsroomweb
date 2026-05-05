import { Feather } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type BookmarkButtonProps = {
  iconSize?: number;
  isBookmarked: boolean;
  onPress: (event: GestureResponderEvent) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function BookmarkButton({
  iconSize = 12,
  isBookmarked,
  onPress,
  size = 24,
  style,
}: BookmarkButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isBookmarked }}
      style={[
        styles.button,
        {
          height: size,
          width: size,
        },
        isBookmarked && styles.buttonSaved,
        style,
      ]}
      onPress={onPress}
    >
      <Feather
        color={isBookmarked ? '#FF2635' : '#FFFFFF'}
        name="bookmark"
        size={iconSize as ComponentProps<typeof Feather>['size']}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 7, 10, 0.82)',
    borderColor: '#6B6D75',
    borderWidth: 1,
    justifyContent: 'center',
  },
  buttonSaved: {
    backgroundColor: 'rgba(255, 38, 53, 0.12)',
    borderColor: '#FF2635',
  },
});
