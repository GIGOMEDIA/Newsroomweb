import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { Text, TextInput } from 'react-native';

export const fontFamily = {
  thin: 'Inter_100Thin',
  extraLight: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const interFonts = {
  [fontFamily.thin]: Inter_100Thin,
  [fontFamily.extraLight]: Inter_200ExtraLight,
  [fontFamily.light]: Inter_300Light,
  [fontFamily.regular]: Inter_400Regular,
  [fontFamily.medium]: Inter_500Medium,
  [fontFamily.semiBold]: Inter_600SemiBold,
  [fontFamily.bold]: Inter_700Bold,
  [fontFamily.extraBold]: Inter_800ExtraBold,
  [fontFamily.black]: Inter_900Black,
};

let defaultsConfigured = false;

/**
 * Patches a React Native text component's `defaultProps.style` so that any
 * unstyled <Text>/<TextInput> renders in Inter Regular instead of the system
 * font. The original style is preserved by being placed *after* our default,
 * so callers can still override `fontFamily` per-instance.
 */
const applyDefaultFont = (Component: typeof Text | typeof TextInput) => {
  const componentWithDefaults = Component as typeof Component & {
    defaultProps?: {
      style?: unknown;
    };
  };

  componentWithDefaults.defaultProps = componentWithDefaults.defaultProps ?? {};
  componentWithDefaults.defaultProps.style = [
    { fontFamily: fontFamily.regular },
    componentWithDefaults.defaultProps.style,
  ];
};

/**
 * Sets Inter Regular as the app-wide default font for <Text> and <TextInput>.
 * Idempotent — guarded by `defaultsConfigured` so repeated calls (e.g. on
 * Fast Refresh) don't keep stacking style entries.
 * Should be called once after fonts have loaded, before the UI mounts.
 */
export const configureGlobalFonts = () => {
  if (defaultsConfigured) {
    return;
  }

  applyDefaultFont(Text);
  applyDefaultFont(TextInput);
  defaultsConfigured = true;
};
