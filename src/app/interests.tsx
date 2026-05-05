import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { interestService } from '@/services/interestService';
import { fontFamily } from '@/utils/typography';

const feedsIcon = require('@/assets/icons/feeds.svg');

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

export default function InterestsScreen() {
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState('Any country');
  const [customInterest, setCustomInterest] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    const loadPreferences = async () => {
      const preferences = await interestService.getPreferences();
      setCountry(preferences.country);
      setSelectedInterests(preferences.interests);
    };

    void loadPreferences();
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((currentInterests) =>
      currentInterests.includes(interest)
        ? currentInterests.filter((item) => item !== interest)
        : [...currentInterests, interest],
    );
  };

  const addCustomInterest = () => {
    const nextInterest = customInterest.trim();

    if (!nextInterest) {
      return;
    }

    setSelectedInterests((currentInterests) =>
      currentInterests.includes(nextInterest)
        ? currentInterests
        : [...currentInterests, nextInterest],
    );
    setCustomInterest('');
  };

  const savePreferences = async () => {
    await interestService.savePreferences({
      country,
      interests: selectedInterests,
    });
    router.back();
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={[styles.backdropHeader, { height: 36 }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <View>
            <Text style={styles.brandName}>NEWSROOM</Text>
            <Text style={styles.brandSubline}>LIVE WIRE</Text>
          </View>
        </View>
        <View style={styles.backdropActions}>
          <Pressable onPress={() => router.replace('/(tabs)')}>
            <Image
              source={feedsIcon}
              style={[styles.feedsIcon, { tintColor: '#555862' }]}
            />
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)/events')}>
            <Feather color="#555862" name="calendar" size={14} />
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)/search')}>
            <Feather color="#555862" name="search" size={14} />
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)/saved')}>
            <Feather color="#555862" name="bookmark" size={14} />
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Feather color="#555862" name="bell" size={14} />
          </Pressable>
          <Pressable style={styles.backdropExit} onPress={() => router.back()}>
            <Feather color="#555862" name="log-in" size={12} />
          </Pressable>
        </View>
      </View>

      <View style={styles.modal}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>PERSONALIZE</Text>
            <Text style={styles.heading}>Make this newsroom yours</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Feather color="#A4A4AD" name="x" size={18} />
          </Pressable>
        </View>

        <Text style={styles.copy}>
          {"Pick your interests and we'll tailor the feed. Skip anytime - you can reopen this from the header."}
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
                placeholder="Add your own (e.g. SaaS, Yoga, Anime)"
                placeholderTextColor="#85858F"
                selectionColor="#FF2635"
                style={styles.customInput}
                value={customInterest}
                onChangeText={setCustomInterest}
              />
              <Pressable style={styles.addButton} onPress={addCustomInterest}>
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
              placeholder="Any country"
              placeholderTextColor="#85858F"
              selectionColor="#FF2635"
              style={styles.countryInput}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <Pressable onPress={() => router.back()}>
            <Text style={styles.skipText}>SKIP FOR NOW</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={savePreferences}>
            <Text style={styles.saveText}>SAVE PREFERENCES</Text>
          </Pressable>
        </View>
      </View>
    </View>
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
  backdropActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 17,
  },
  backdropExit: {
    alignItems: 'center',
    borderColor: '#252830',
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  backdropHeader: {
    alignItems: 'center',
    backgroundColor: '#07090B',
    borderBottomColor: '#191B20',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 36,
    justifyContent: 'space-between',
    opacity: 0.52,
    paddingHorizontal: 8,
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  brandSubline: {
    color: '#A1A1AA',
    fontFamily: fontFamily.medium,
    fontSize: 5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  closeButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  content: {
    paddingBottom: 6,
  },
  copy: {
    color: '#A0A0A9',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  countryInput: {
    backgroundColor: '#0D0F13',
    borderColor: '#2A2D34',
    borderWidth: 1,
    color: '#FFFFFF',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    height: 36,
    paddingHorizontal: 12,
  },
  customInput: {
    backgroundColor: '#0D0F13',
    borderColor: '#2A2D34',
    borderWidth: 1,
    color: '#FFFFFF',
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 9,
    height: 31,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  customRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 11,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#1D2026',
    borderTopColor: '#2A2D34',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 101,
    paddingHorizontal: 16,
  },
  feedsIcon: {
    height: 14,
    width: 14,
  },
  group: {
    marginTop: 23,
    paddingHorizontal: 16,
  },
  groupTitle: {
    color: '#8B8B96',
    fontFamily: fontFamily.bold,
    fontSize: 7,
  },
  groupTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 9,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 19,
    lineHeight: 23,
  },
  kicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    marginBottom: 5,
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
  modal: {
    backgroundColor: '#191B20',
    borderColor: '#22252B',
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 1,
  },
  safeArea: {
    backgroundColor: '#1F1F1F',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF2635',
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  skipText: {
    color: '#A0A0A9',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
});
