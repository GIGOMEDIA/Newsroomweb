export type EventType =
  | 'all'
  | 'conference'
  | 'meetup'
  | 'hackathon'
  | 'workshop';

export type EventTimeRange =
  | 'anytime'
  | 'today'
  | 'thisWeek'
  | 'thisMonth';

export type EventItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  country: string;
  dateLabel: string;
  source: string;
  type: Exclude<EventType, 'all'>;
  url: string;
};

export type EventFilters = {
  city: string;
  country: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  timeRange: EventTimeRange;
  type: EventType;
};

export type EventResult = {
  cachedAt?: string;
  error?: string;
  events: EventItem[];
  isFallback: boolean;
  isFromCache: boolean;
};
