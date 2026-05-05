import { eventsApi } from '@/api/eventsApi';
import {
  EventFilters,
  EventItem,
  EventTimeRange,
  EventType,
} from '@/types/event';
import { newsService } from './newsService';

export type EventFetchResult = {
  events: EventItem[];
  isFallback: boolean;
};

/**
 * Best-effort classification of a free-text query into an EventType. Used
 * only when falling back to GNews articles — the real PredictHQ response
 * carries an explicit type. Defaults to 'meetup' if no keyword matches.
 */
const toEventType = (query: string): Exclude<EventType, 'all'> => {
  const normalized = query.toLowerCase();

  if (normalized.includes('conference')) {
    return 'conference';
  }

  if (normalized.includes('hackathon')) {
    return 'hackathon';
  }

  if (normalized.includes('workshop')) {
    return 'workshop';
  }

  return 'meetup';
};

/**
 * Adapts a news article into an `EventItem` so the same UI can render either
 * a real PredictHQ event or a news-derived fallback when events are
 * unavailable. Date is hard-coded to "Check organizer" because articles
 * don't carry event start times.
 */
const toFallbackEvent = (
  article: Awaited<ReturnType<typeof newsService.searchArticles>>['articles'][number],
  filters: EventFilters,
): EventItem => ({
  city: filters.city,
  country: filters.country,
  dateLabel: 'Check organizer',
  description: article.description || article.content || article.source.name,
  id: article.id,
  source: `${article.source.name} / GNews`,
  title: article.title,
  type: toEventType(`${filters.type} ${article.title}`),
  url: article.url,
});

/**
 * Builds the GNews search string used for the fallback path. Combines the
 * user's explicit query, the chosen type, the city, and a catch-all set of
 * event-related terms — joined with spaces so GNews treats them as a soft
 * AND. Empty parts are dropped so we don't end up with double spaces.
 */
const getFallbackQuery = (filters: EventFilters) => {
  const typeQuery = filters.type === 'all' ? 'events' : filters.type;
  const customQuery = filters.query?.trim();

  return [
    customQuery,
    typeQuery,
    filters.city,
    'conference meetup hackathon workshop',
  ]
    .filter(Boolean)
    .join(' ');
};

export const eventService = {
  /**
   * Fetches events for the given filters, with a graceful degradation path:
   *   1. Try PredictHQ via `eventsApi.searchEvents`.
   *   2. On failure, search GNews for related articles and return them as
   *      synthetic `EventItem`s with `isFallback: true` so the UI can show
   *      a "showing related news instead" banner.
   *   3. If even the fallback returns no articles, re-throw the *original*
   *      events error so the user sees the relevant failure.
   */
  async getEvents(filters: EventFilters): Promise<EventFetchResult> {
    try {
      const events = await eventsApi.searchEvents(filters);

      return { events, isFallback: false };
    } catch (eventsError) {
      const fallback = await newsService.searchArticles(
        getFallbackQuery(filters),
      );

      if (fallback.articles.length > 0) {
        return {
          events: fallback.articles.map((article) =>
            toFallbackEvent(article, filters),
          ),
          isFallback: true,
        };
      }

      throw eventsError;
    }
  },
};

export const eventTimeRanges: {
  label: string;
  value: EventTimeRange;
}[] = [
  { label: 'Any time', value: 'anytime' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'thisWeek' },
  { label: 'This month', value: 'thisMonth' },
];
