import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EmailAlreadyInUseException,
  NetworkException,
  WeakPasswordException,
} from 'rn-swiftauth-sdk';

import { InterestsModal } from '@/components/InterestsModal';
import { NewsroomHeader } from '@/components/NewsroomHeader';
import { useAppAuth } from '@/hooks/useAppAuth';
import { fontFamily } from '@/utils/typography';

const friendlyError = (error: unknown): string => {
  if (error instanceof EmailAlreadyInUseException) {
    return 'That email is already registered. Try signing in instead.';
  }
  if (error instanceof WeakPasswordException) {
    return 'Password is too weak. Use at least 6 characters with a mix of letters and numbers.';
  }
  if (error instanceof NetworkException) {
    return 'You appear to be offline. Reconnect and try again.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Sign up failed. Please try again.';
};

export default function SignUpScreen() {
  const { signUpWithEmail, isLoading, error, clearError, isOnline } =
    useAppAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [interestsOpen, setInterestsOpen] = useState(false);

  useEffect(() => {
    return () => {
      clearError?.();
    };
  }, [clearError]);

  const handleSignUp = async () => {
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Enter your email and a password.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (!isOnline) {
      setLocalError('You appear to be offline. Reconnect to create an account.');
      return;
    }

    try {
      await signUpWithEmail({ email: email.trim(), password });
      router.back();
    } catch (signUpError) {
      setLocalError(friendlyError(signUpError));
    }
  };

  const message = localError ?? (error ? friendlyError(error) : null);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <NewsroomHeader />

        <KeyboardAwareScrollView
          bottomOffset={24}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.flex}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>
              Check the <Text style={styles.subtitleAccent}>DOM</Text> to find
              what to do on the{' '}
              <Text style={styles.subtitleAccent}>AUTH flow</Text>.
            </Text>

            {!isOnline ? (
              <View style={styles.offlineBanner}>
                <Feather color="#F5C84B" name="wifi-off" size={11} />
                <Text style={styles.offlineBannerText}>
                  You&apos;re offline. Account creation needs a connection.
                </Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#83838D"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <TextInput
                autoCapitalize="none"
                autoComplete="password-new"
                autoCorrect={false}
                placeholder="Password"
                placeholderTextColor="#83838D"
                secureTextEntry={!isPasswordVisible}
                style={[styles.input, styles.inputWithAdornment]}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                accessibilityLabel={
                  isPasswordVisible ? 'Hide password' : 'Show password'
                }
                hitSlop={8}
                style={styles.fieldAdornment}
                onPress={() => setIsPasswordVisible((value) => !value)}
              >
                <Feather
                  color="#83838D"
                  name={isPasswordVisible ? 'eye-off' : 'eye'}
                  size={16}
                />
              </Pressable>
            </View>

            <View style={styles.field}>
              <TextInput
                autoCapitalize="none"
                autoComplete="password-new"
                autoCorrect={false}
                placeholder="Confirm password"
                placeholderTextColor="#83838D"
                secureTextEntry={!isConfirmVisible}
                style={[styles.input, styles.inputWithAdornment]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                accessibilityLabel={
                  isConfirmVisible ? 'Hide password' : 'Show password'
                }
                hitSlop={8}
                style={styles.fieldAdornment}
                onPress={() => setIsConfirmVisible((value) => !value)}
              >
                <Feather
                  color="#83838D"
                  name={isConfirmVisible ? 'eye-off' : 'eye'}
                  size={16}
                />
              </Pressable>
            </View>

            {message ? (
              <Text style={styles.errorText}>{message}</Text>
            ) : null}

            <Pressable
              disabled={isLoading}
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleSignUp}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>SIGN UP</Text>
              )}
            </Pressable>

            <Text style={styles.footerHint}>
              Something about{' '}
              <Text
                style={styles.footerLink}
                onPress={() => router.replace('/auth/signin')}
              >
                Sign In
              </Text>{' '}
              is suppose to be somewhere around here
            </Text>
          </View>
        </KeyboardAwareScrollView>

        <View style={styles.bottomFooter}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Text style={styles.copyright}>(c) 2026 NEWSROOM</Text>
            <Pressable
              style={styles.interestButton}
              onPress={() => setInterestsOpen(true)}
            >
              <Ionicons color="#F0CED0" name="sparkles-outline" size={12} />
              <Text style={styles.interestText}>SELECT INTERESTS</Text>
            </Pressable>
          </View>
          <Text style={styles.poweredBy}>POWERED BY GNEWS</Text>
        </View>
      </View>

      <InterestsModal
        onClose={() => setInterestsOpen(false)}
        visible={interestsOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomFooter: {
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  card: {
    backgroundColor: '#0D0F13',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  copyright: {
    color: '#878791',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  errorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 14,
  },
  field: {
    borderBottomColor: '#FF2635',
    borderBottomWidth: 1,
    marginTop: 14,
    position: 'relative',
  },
  fieldAdornment: {
    alignItems: 'center',
    bottom: 0,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 32,
  },
  flex: {
    flex: 1,
  },
  footerDivider: {
    backgroundColor: '#1C1E23',
    height: 1,
    marginBottom: 14,
  },
  footerHint: {
    color: '#7B7B85',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  footerLink: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    color: '#FFFFFF',
    fontFamily: fontFamily.regular,
    fontSize: 13,
    height: 38,
  },
  inputWithAdornment: {
    paddingRight: 36,
  },
  interestButton: {
    alignItems: 'center',
    backgroundColor: '#3A2024',
    flexDirection: 'row',
    gap: 5,
    height: 22,
    paddingHorizontal: 8,
  },
  interestText: {
    color: '#F3D7D9',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  offlineBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 200, 75, 0.08)',
    borderColor: 'rgba(245, 200, 75, 0.4)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  offlineBannerText: {
    color: '#F5C84B',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  poweredBy: {
    color: '#92929B',
    fontFamily: fontFamily.medium,
    fontSize: 8,
    marginTop: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    height: 42,
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 14,
  },
  subtitle: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  subtitleAccent: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
  },
});
