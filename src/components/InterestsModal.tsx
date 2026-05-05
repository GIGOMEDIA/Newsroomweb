import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { interestService } from '@/services/interestService';
import { fontFamily } from '@/utils/typography';

const categoryInterests = [
  'Top Stories',
  'Business',
  'Technology',
  'World',
  'Sports',
  'Science',
  'Health',
  'Entertainment',
];

const topicInterests = [
  'AI',
  'Startups',
  'Crypto',
  'Climate',
  'Space',
  'Football',
  'Formula 1',
  'Basketball',
  'Cycling',
  'Hiking',
  'Photography',
  'Gaming',
  'Movies',
  'Music',
  'Cooking',
  'Travel',
  'Fashion',
  'Stock Market',
  'Real Estate',
  'Productivity',
  'Design',
  'Programming',
  'Cybersecurity',
  'Healthcare',
  'Education',
  'Politics',
  'Books',
  'EVs',
];

type Props = {
  onClose: () => void;
  onSaved?: () => void;
  visible: boolean;
};

export function InterestsModal({ onClose, onSaved, visible }: Props) {
  const layout = useAdaptiveLayout();
  const [country, setCountry] = useState('Any country');
  const [customInterest, setCustomInterest] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;

    const loadPreferences = async () => {
      const preferences = await interestService.getPreferences();
      setCountry(preferences.country);
      setSelectedInterests(preferences.interests);
    };

    void loadPreferences();
  }, [visible]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((entry) => entry !== interest)
        : [...current, interest],
    );
  };

  const addCustomInterest = () => {
    const next = customInterest.trim();
    if (!next || selectedInterests.includes(next)) {
      setCustomInterest('');
      return;
    }
    setSelectedInterests((current) => [...current, next]);
    setCustomInterest('');
  };

  const savePreferences = async () => {
    await interestService.savePreferences({
      country,
      interests: selectedInterests,
    });
    onSaved?.();
    onClose();
  };

  const cardWidth = Math.min(layout.width - 32, 520);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.scrim}>
        <Pressable
          accessibilityLabel="Dismiss interests modal"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.kicker}>PERSONALIZE</Text>
              <Text style={styles.heading}>Make this newsroom yours</Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Feather color="#A4A4AD" name="x" size={18} />
            </Pressable>
          </View>

          <Text style={styles.copy}>
            Pick your interests and we&apos;ll tailor the feed. You can reopen
            this anytime from the feed.
          </Text>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.group}>
              <View style={styles.groupTitleRow}>
                <Feather color="#8B8B96" name="tag" size={12} />
                <Text style={styles.groupTitle}>CATEGORIES</Text>
              </View>
              <View style={styles.chips}>
                {categoryInterests.map((interest) => (
                  <FilterChip
                    key={interest}
                    isSelected={selectedInterests.includes(interest)}
                    label={interest}
                    onPress={() => toggleInterest(interest)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <View style={styles.groupTitleRow}>
                <Feather color="#8B8B96" name="settings" size={12} />
                <Text style={styles.groupTitle}>HOBBIES, WORK & TOPICS</Text>
              </View>
              <View style={styles.chips}>
                {topicInterests.map((interest) => (
                  <FilterChip
                    key={interest}
                    isSelected={selectedInterests.includes(interest)}
                    label={interest}
                    onPress={() => toggleInterest(interest)}
                  />
                ))}
              </View>

              <View style={styles.customRow}>
                <TextInput
                  onChangeText={setCustomInterest}
                  placeholder="Add your own (e.g. SaaS, Yoga, Anime)"
                  placeholderTextColor="#85858F"
                  selectionColor="#FF2635"
                  style={styles.customInput}
                  value={customInterest}
                />
                <Pressable
                  onPress={addCustomInterest}
                  style={styles.addButton}
                >
                  <Feather color="#FFFFFF" name="plus" size={16} />
                </Pressable>
              </View>
            </View>

            <View style={styles.group}>
              <View style={styles.groupTitleRow}>
                <Feather color="#8B8B96" name="map-pin" size={12} />
                <Text style={styles.groupTitle}>GEOGRAPHY</Text>
              </View>
              <TextInput
                onChangeText={setCountry}
                placeholder="Any country"
                placeholderTextColor="#85858F"
                selectionColor="#FF2635"
                style={styles.countryInput}
                value={country}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose}>
              <Text style={styles.skipText}>SKIP FOR NOW</Text>
            </Pressable>
            <Pressable onPress={savePreferences} style={styles.saveButton}>
              <Text style={styles.saveText}>SAVE PREFERENCES</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: '#0F1115',
    borderColor: '#2B2D34',
    borderWidth: 1,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  card: {
    backgroundColor: '#15171B',
    borderColor: '#22252B',
    borderWidth: 1,
    maxHeight: '88%',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  closeButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  content: {
    paddingTop: 14,
  },
  copy: {
    color: '#A4A4AD',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  countryInput: {
    backgroundColor: '#0F1115',
    borderColor: '#2B2D34',
    borderWidth: 1,
    color: '#FFFFFF',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    height: 34,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  customInput: {
    backgroundColor: '#0F1115',
    borderColor: '#2B2D34',
    borderWidth: 1,
    color: '#FFFFFF',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    height: 31,
    paddingHorizontal: 10,
  },
  customRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: '#22252B',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    color: '#8B8B96',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  groupTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 9,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
    marginTop: 2,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  saveButton: {
    backgroundColor: '#FF2635',
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  scrim: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#A0A0A9',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
});
