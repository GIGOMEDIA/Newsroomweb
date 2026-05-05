import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { NewsroomHeader } from '@/components/NewsroomHeader';
import { useEventsQuery } from '@/hooks/queries/useEventsQuery';
import { useAdaptiveLayout } from '@/hooks/platform/useAdaptiveLayout';
import { useKeyboardShortcuts } from '@/hooks/platform/useKeyboardShortcuts';
import { eventTimeRanges } from '@/services/eventService';
import { newsErrorMessage } from '@/services/newsService';
import { EventFilters, EventItem, EventType } from '@/types/event';
import { fontFamily } from '@/utils/typography';

const cityOptions = [
  { city: 'Lagos', country: 'NG', label: 'LAGOS - NIGERIA' },
  { city: 'Abuja', country: 'NG', label: 'ABUJA - NIGERIA' },
  { city: 'Nairobi', country: 'KE', label: 'NAIROBI - KENYA' },
  { city: 'Cape Town', country: 'ZA', label: 'CAPE TOWN - SOUTH AFRICA' },
  { city: 'Accra', country: 'GH', label: 'ACCRA - GHANA' },
];

const eventTypes: { label: string; value: EventType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Conference', value: 'conference' },
  { label: 'Meetup', value: 'meetup' },
  { label: 'Hackathon', value: 'hackathon' },
  { label: 'Workshop', value: 'workshop' },
];

const defaultFilters: EventFilters = {
  city: 'Lagos',
  country: 'NG',
  timeRange: 'anytime',
  type: 'all',
};

function EventCard({ event }: { event: EventItem }) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventIconWrap}>
        <Feather color="#85858F" name="calendar" size={34} />
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventMeta}>
          {event.type.toUpperCase()} - {event.dateLabel}
        </Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text numberOfLines={2} style={styles.eventDescription}>
          {event.description}
        </Text>
        <Text style={styles.eventSource}>
          {event.city}, {event.country} - {event.source}
        </Text>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const layout = useAdaptiveLayout();
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);
  const [cityQuery, setCityQuery] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);

  const eventsQuery = useEventsQuery(filters);
  useKeyboardShortcuts(
    useMemo(
      () => ({
        refresh: () => {
          void eventsQuery.refetch();
        },
      }),
      [eventsQuery],
    ),
  );
  const isLoading = eventsQuery.isFetching;
  const errorMessage = eventsQuery.isError
    ? newsErrorMessage(eventsQuery.error)
    : undefined;

  const sortedEvents = useMemo<EventItem[]>(
    () => eventsQuery.data?.events ?? [],
    [eventsQuery.data],
  );

  const chooseCity = (city: string, country: string) => {
    setFilters((current) => ({ ...current, city, country }));
  };

  const submitCity = () => {
    const nextCity = cityQuery.trim();

    if (!nextCity) {
      return;
    }

    setFilters((current) => ({ ...current, city: nextCity }));
    setCityQuery('');
  };

  const useCurrentLocation = async () => {
    setLocationError(null);
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setLocationError('Location permission denied. Pick a city manually.');
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [place] = await Location.reverseGeocodeAsync(position.coords);
    const city =
      place.city ??
      place.subregion ??
      place.district ??
      place.region ??
      filters.city;
    const country = place.isoCountryCode ?? filters.country;

    setFilters((current) => ({
      ...current,
      city,
      country,
    }));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <NewsroomHeader />

        <View
          style={[
            styles.hero,
            layout.usesTopNav && styles.desktopConstrained,
            { maxWidth: layout.contentMaxWidth },
          ]}
        >
          <Text style={styles.kicker}>TECH EVENTS</Text>
          <Text style={styles.heading}>
            {`What's happening in ${filters.city}`}
          </Text>
          <Text style={styles.copy}>
            {
              "Upcoming tech conferences, hackathons, meetups, and developer events near you."
            }
          </Text>
        </View>

        <FlashList
          contentContainerStyle={[
            styles.content,
            layout.usesTopNav && styles.desktopConstrained,
            { maxWidth: layout.contentMaxWidth },
          ]}
          data={sortedEvents}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <Pressable
                style={styles.locationButton}
                onPress={useCurrentLocation}
              >
                <Feather color="#CFCFD6" name="map-pin" size={11} />
                <Text style={styles.locationText}>USE MY LOCATION</Text>
              </Pressable>

              {locationError ? (
                <View style={styles.locationNotice}>
                  <Text style={styles.locationNoticeText}>{locationError}</Text>
                </View>
              ) : null}

              <View style={styles.chips}>
                {cityOptions.map((option) => (
                  <FilterChip
                    key={option.label}
                    isSelected={
                      filters.city === option.city &&
                      filters.country === option.country
                    }
                    label={option.label}
                    onPress={() => chooseCity(option.city, option.country)}
                  />
                ))}
              </View>

              <View style={styles.cityRow}>
                <TextInput
                  placeholder="Other city..."
                  placeholderTextColor="#85858F"
                  selectionColor="#FF2635"
                  style={styles.cityInput}
                  value={cityQuery}
                  onChangeText={setCityQuery}
                />
                <TextInput
                  placeholder="NG"
                  placeholderTextColor="#85858F"
                  selectionColor="#FF2635"
                  style={styles.countryInput}
                  value={filters.country}
                  onChangeText={(country) =>
                    setFilters((current) => ({
                      ...current,
                      country: country.toUpperCase(),
                    }))
                  }
                />
                <Pressable style={styles.goButton} onPress={submitCity}>
                  <Text style={styles.goText}>GO</Text>
                </Pressable>
              </View>

              <Text style={styles.filterLabel}>WHEN</Text>
              <View style={styles.chips}>
                {eventTimeRanges.map((range) => (
                  <FilterChip
                    key={range.value}
                    isSelected={filters.timeRange === range.value}
                    label={range.label}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        timeRange: range.value,
                      }))
                    }
                  />
                ))}
              </View>

              <Text style={styles.filterLabel}>TYPE</Text>
              <View style={styles.chips}>
                {eventTypes.map((type) => (
                  <FilterChip
                    key={type.value}
                    isSelected={filters.type === type.value}
                    label={type.label}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        type: type.value,
                      }))
                    }
                  />
                ))}
              </View>

              <View style={styles.filterPanel}>
                <View style={styles.filterPanelTitle}>
                  <Feather color="#85858F" name="filter" size={12} />
                  <Text style={styles.filterTitle}>FILTERS</Text>
                </View>
                <Text style={styles.filterHint}>
                  {eventsQuery.data?.isFallback
                    ? 'Showing event announcements from news coverage.'
                    : 'Showing structured events from PredictHQ when available.'}
                </Text>
              </View>

              {errorMessage ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>{errorMessage}</Text>
                </View>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingPanel}>
                  <Feather color="#85858F" name="loader" size={26} />
                  <Text style={styles.emptyTitle}>Finding events...</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.emptyPanel}>
                <Feather color="#85858F" name="calendar" size={38} />
                <Text style={styles.emptyTitle}>No events match your filters</Text>
                <Text style={styles.emptyCopy}>
                  {`We couldn't find any tech events in ${filters.city}. Try widening your filters or picking another city.`}
                </Text>
                <Pressable
                  style={styles.tryButton}
                  onPress={() => eventsQuery.refetch()}
                >
                  <Feather color="#CFCFD6" name="refresh-cw" size={10} />
                  <Text style={styles.tryText}>TRY AGAIN</Text>
                </Pressable>
              </View>
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerCopy}>
                Events are surfaced from PredictHQ when configured, with GNews coverage as fallback for local announcements across Nigeria and Africa. Always confirm dates and venues with the organizer before attending.
              </Text>
              <View style={styles.footerDivider} />
              <View style={styles.footerMeta}>
                <Text style={styles.copyright}>(c) 2026 NEWSROOM</Text>
                <Text style={styles.poweredBy}>POWERED BY GNEWS</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => <EventCard event={item} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 9,
  },
  cityInput: {
    borderColor: '#282B32',
    borderWidth: 1,
    color: '#FFFFFF',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 14,
    minHeight: 34,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'center',
    width: '58%',
  },
  cityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  content: {
    paddingHorizontal: 13,
    paddingTop: 12,
  },
  desktopConstrained: {
    alignSelf: 'center',
    width: '100%',
  },
  copy: {
    color: '#A0A0A9',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    width: '82%',
  },
  copyright: {
    color: '#85858F',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  countryInput: {
    borderColor: '#282B32',
    borderWidth: 1,
    color: '#FFFFFF',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 14,
    minHeight: 34,
    paddingHorizontal: 4,
    paddingVertical: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 52,
  },
  emptyCopy: {
    color: '#85858F',
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyPanel: {
    alignItems: 'center',
    borderColor: '#22252B',
    borderWidth: 1,
    minHeight: 190,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginTop: 12,
  },
  eventBody: {
    flex: 1,
  },
  eventCard: {
    borderColor: '#22252B',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  eventDescription: {
    color: '#85858F',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
  eventIconWrap: {
    alignItems: 'center',
    backgroundColor: '#15171B',
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  eventMeta: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 7,
  },
  eventSource: {
    color: '#9C9CA6',
    fontFamily: fontFamily.medium,
    fontSize: 8,
    marginTop: 7,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 5,
  },
  filterHint: {
    color: '#85858F',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
  },
  filterLabel: {
    color: '#8B8B96',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    marginBottom: 8,
  },
  filterPanel: {
    borderColor: '#22252B',
    borderWidth: 1,
    marginTop: 21,
    padding: 12,
  },
  filterPanelTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  filterTitle: {
    color: '#8B8B96',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  footer: {
    paddingBottom: 28,
    paddingTop: 14,
  },
  footerCopy: {
    color: '#85858F',
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 15,
  },
  footerDivider: {
    backgroundColor: '#1C1E23',
    height: 1,
    marginVertical: 24,
  },
  footerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goButton: {
    alignItems: 'center',
    backgroundColor: '#3A2024',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  goText: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 25,
    lineHeight: 30,
  },
  hero: {
    backgroundColor: '#15171B',
    borderBottomColor: '#22252B',
    borderBottomWidth: 1,
    paddingBottom: 21,
    paddingHorizontal: 13,
    paddingTop: 14,
  },
  kicker: {
    color: '#FF2635',
    fontFamily: fontFamily.bold,
    fontSize: 8,
    marginBottom: 4,
  },
  loadingPanel: {
    alignItems: 'center',
    borderColor: '#22252B',
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 150,
  },
  locationButton: {
    alignItems: 'center',
    borderColor: '#282B32',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 30,
    marginBottom: 12,
    paddingHorizontal: 11,
    width: 130,
  },
  locationNotice: {
    borderColor: '#4B2428',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  locationNoticeText: {
    color: '#F0CED0',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  locationText: {
    color: '#CFCFD6',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
  notice: {
    borderColor: '#4B2428',
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  noticeText: {
    color: '#F0CED0',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  poweredBy: {
    color: '#85858F',
    fontFamily: fontFamily.medium,
    fontSize: 8,
  },
  safeArea: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  screen: {
    backgroundColor: '#07090B',
    flex: 1,
  },
  tryButton: {
    alignItems: 'center',
    borderColor: '#282B32',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 28,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  tryText: {
    color: '#CFCFD6',
    fontFamily: fontFamily.bold,
    fontSize: 8,
  },
});
