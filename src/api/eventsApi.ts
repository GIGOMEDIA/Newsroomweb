import { EventFilters, EventItem } from '@/types/event';
import { buildApiUrl, env } from '@/utils/env';

type PredictHQEvent = {
  category?: string;
  country?: string;
  description?: string;
  id?: string;
  labels?: string[];
  phq_labels?: string[];
  rank?: number;
  start?: string;
  timezone?: string;
  title?: string;
  geo?: {
    address?: {
      country_code?: string;
      formatted_address?: string;
      locality?: string;
    };
  };
};

type PredictHQResponse = {
  results?: PredictHQEvent[];
};

type CityLocation = {
  country: string;
  latitude: number;
  longitude: number;
};

const cityLocations: Record<string, CityLocation> = {
  abuja: { country: 'NG', latitude: 9.0765, longitude: 7.3986 },
  accra: { country: 'GH', latitude: 5.6037, longitude: -0.187 },
  'cape town': { country: 'ZA', latitude: -33.9249, longitude: 18.4241 },
  lagos: { country: 'NG', latitude: 6.5244, longitude: 3.3792 },
  nairobi: { country: 'KE', latitude: -1.2921, longitude: 36.8219 },
};

export class EventsApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'EventsApiError';
    this.status = status;
  }
}

const toDateLabel = (value?: string) => {
  if (!value) {
    return 'Date TBA';
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const toEventType = (event: PredictHQEvent): EventItem['type'] => {
  const normalized = [
    event.category,
    ...(event.labels ?? []),
    ...(event.phq_labels ?? []),
    event.title,
  ]
    .join(' ')
    .toLowerCase();

  if (normalized.includes('conference') || normalized.includes('expo')) {
    return 'conference';
  }

  if (normalized.includes('hack')) {
    return 'hackathon';
  }

  if (normalized.includes('workshop')) {
    return 'workshop';
  }

  return 'meetup';
};

const normalizeEvent = (event: PredictHQEvent): EventItem | null => {
  if (!event.id || !event.title) {
    return null;
  }

  return {
    city: event.geo?.address?.locality ?? 'Africa',
    country: event.geo?.address?.country_code ?? event.country ?? 'NG',
    dateLabel: toDateLabel(event.start),
    description:
      event.description ??
      event.geo?.address?.formatted_address ??
      'Event details available from organizer.',
    id: event.id,
    source: 'PredictHQ',
    title: event.title,
    type: toEventType(event),
    url: `https://www.predicthq.com/events/${event.id}`,
  };
};

const isEventItem = (event: EventItem | null): event is EventItem =>
  event !== null;

const getDateRange = (timeRange: EventFilters['timeRange']) => {
  const now = new Date();
  const end = new Date(now);

  if (timeRange === 'today') {
    end.setHours(23, 59, 59, 999);
  } else if (timeRange === 'thisWeek') {
    end.setDate(now.getDate() + 7);
  } else if (timeRange === 'thisMonth') {
    end.setMonth(now.getMonth() + 1);
  } else {
    return {
      'start.gte': now.toISOString(),
    };
  }

  return {
    'start.gte': now.toISOString(),
    'start.lte': end.toISOString(),
  };
};

const getQuery = (filters: EventFilters) => {
  const eventTypeQuery = filters.type === 'all' ? '' : filters.type;

  return [
    filters.query,
    eventTypeQuery,
    'tech developer startup conference meetup hackathon workshop',
  ]
    .filter(Boolean)
    .join(' ');
};

export const eventsApi = {
  async searchEvents(filters: EventFilters): Promise<EventItem[]> {
    if (!env.predicthqApiKey) {
      throw new EventsApiError('Add a PredictHQ API key to enable live events.');
    }

    const cityLocation = cityLocations[filters.city.toLowerCase()];
    const url = buildApiUrl(env.eventsApiBaseUrl, 'events/');
    const dateRange = getDateRange(filters.timeRange);

    url.searchParams.set('country', filters.country);
    url.searchParams.set('limit', '20');
    url.searchParams.set('q', getQuery(filters));
    url.searchParams.set('sort', 'start');

    if (cityLocation) {
      url.searchParams.set(
        'within',
        `80km@${cityLocation.latitude},${cityLocation.longitude}`,
      );
    }

    Object.entries(dateRange).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.predicthqApiKey}`,
        Accept: 'application/json',
      },
    });
    const data = (await response.json()) as PredictHQResponse;

    if (!response.ok) {
      throw new EventsApiError('Unable to load events right now.', response.status);
    }

    return data.results?.map(normalizeEvent).filter(isEventItem) ?? [];
  },
};
