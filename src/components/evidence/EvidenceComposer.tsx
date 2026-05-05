import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EvidenceType, MAX_IMAGE_BYTES } from '@/types/evidence';
import { fontFamily } from '@/utils/typography';

type PickedImage = {
  uri: string;
  fileSize?: number;
};

type EvidenceComposerProps = {
  isOffline: boolean;
  isSubmitting: boolean;
  onSubmitLink: (url: string, caption: string) => Promise<void>;
  onSubmitNote: (caption: string) => Promise<void>;
  onSubmitImage: (
    image: PickedImage,
    caption: string,
  ) => Promise<void>;
};

export function EvidenceComposer({
  isOffline,
  isSubmitting,
  onSubmitLink,
  onSubmitNote,
  onSubmitImage,
}: EvidenceComposerProps) {
  const [activeType, setActiveType] = useState<EvidenceType | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setLinkUrl('');
    setCaption('');
    setPicked(null);
    setLocalError(null);
    setActiveType(null);
  };

  const pickImage = async (source: 'library' | 'camera') => {
    setLocalError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setLocalError(
          source === 'camera'
            ? 'Camera permission denied. Enable it in settings to add a photo.'
            : 'Photo library permission denied. Enable it in settings.',
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              mediaTypes: 'images',
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              mediaTypes: 'images',
              quality: 0.85,
            });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        Alert.alert(
          'Image too large',
          'Pick an image under 2 MB so it uploads quickly.',
        );
        return;
      }

      setPicked({ fileSize: asset.fileSize, uri: asset.uri });
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : 'Could not open image picker.',
      );
    }
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      if (activeType === 'link') {
        if (!linkUrl.trim()) {
          setLocalError('Add a URL.');
          return;
        }
        await onSubmitLink(linkUrl, caption);
        reset();
      } else if (activeType === 'note') {
        if (!caption.trim()) {
          setLocalError('Write something.');
          return;
        }
        await onSubmitNote(caption);
        reset();
      } else if (activeType === 'image') {
        if (!picked) {
          setLocalError('Pick an image first.');
          return;
        }
        await onSubmitImage(picked, caption);
        reset();
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : 'Could not submit evidence.',
      );
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabRow}>
        {(['link', 'image', 'note'] as const).map((type) => {
          const isActive = activeType === type;
          return (
            <Pressable
              key={type}
              disabled={isSubmitting}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveType(isActive ? null : type)}
            >
              <Feather
                color={isActive ? '#FFFFFF' : '#A4A4AD'}
                name={
                  type === 'link'
                    ? 'link'
                    : type === 'image'
                      ? 'image'
                      : 'edit-3'
                }
                size={11}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {type === 'link' ? 'LINK' : type === 'image' ? 'IMAGE' : 'NOTE'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeType ? (
        <View style={styles.form}>
          {activeType === 'link' ? (
            <View style={styles.fieldBlock}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="url"
                placeholder="https://example.com/source"
                placeholderTextColor="#6E6E78"
                style={styles.input}
                value={linkUrl}
                onChangeText={setLinkUrl}
              />
            </View>
          ) : null}

          {activeType === 'image' ? (
            <View style={styles.fieldBlock}>
              {picked ? (
                <View style={styles.imagePreview}>
                  <Image
                    contentFit="cover"
                    source={{ uri: picked.uri }}
                    style={styles.thumbnail}
                  />
                  <Pressable
                    hitSlop={6}
                    style={styles.imageRemove}
                    onPress={() => setPicked(null)}
                  >
                    <Feather color="#FFFFFF" name="x" size={12} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.imageActions}>
                  <Pressable
                    disabled={isSubmitting}
                    style={styles.imageButton}
                    onPress={() => pickImage('library')}
                  >
                    <Feather color="#E6E6EA" name="image" size={12} />
                    <Text style={styles.imageButtonText}>PICK PHOTO</Text>
                  </Pressable>
                  <Pressable
                    disabled={isSubmitting}
                    style={styles.imageButton}
                    onPress={() => pickImage('camera')}
                  >
                    <Feather color="#E6E6EA" name="camera" size={12} />
                    <Text style={styles.imageButtonText}>CAMERA</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.imageHint}>
                Up to 2 MB. JPG, PNG, HEIC, WebP — anything your phone takes.
              </Text>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <TextInput
              editable={!isSubmitting}
              multiline
              placeholder={
                activeType === 'note'
                  ? 'Write your note...'
                  : 'Optional caption'
              }
              placeholderTextColor="#6E6E78"
              style={[
                styles.input,
                activeType === 'note' ? styles.inputMultiline : null,
              ]}
              value={caption}
              onChangeText={setCaption}
            />
          </View>

          {localError ? (
            <Text style={styles.errorText}>{localError}</Text>
          ) : null}

          {isOffline ? (
            <Text style={styles.offlineNote}>
              You&apos;re offline. This will sync when you reconnect.
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              disabled={isSubmitting}
              style={styles.cancelButton}
              onPress={reset}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather color="#FFFFFF" name="upload" size={11} />
                  <Text style={styles.submitText}>ADD EVIDENCE</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelText: {
    color: '#A4A4AD',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  errorText: {
    color: '#FF8893',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  fieldBlock: {
    marginTop: 12,
  },
  form: {
    backgroundColor: '#0A0C10',
    borderColor: '#1B1D22',
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imageButton: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    height: 38,
    justifyContent: 'center',
  },
  imageButtonText: {
    color: '#E6E6EA',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  imageHint: {
    color: '#6E6E78',
    fontFamily: fontFamily.regular,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 7,
  },
  imagePreview: {
    position: 'relative',
  },
  imageRemove: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
  },
  input: {
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    color: '#E6E6EA',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputMultiline: {
    maxHeight: 120,
    minHeight: 70,
  },
  offlineNote: {
    color: '#F5C84B',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#FF2635',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    height: 36,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  tab: {
    alignItems: 'center',
    borderColor: '#26282E',
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    height: 32,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 38, 53, 0.18)',
    borderColor: '#FF2635',
  },
  tabLabel: {
    color: '#A4A4AD',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thumbnail: {
    aspectRatio: 16 / 10,
    backgroundColor: '#15171B',
    borderColor: '#1F2127',
    borderWidth: 1,
    width: '100%',
  },
  wrapper: {
    width: '100%',
  },
});
