import { useQuery } from '@tanstack/react-query';

import { eventService, EventFetchResult } from '@/services/eventService';
import { queryKeys } from '@/services/queryClient';
import { EventFilters } from '@/types/event';

const TWO_MINUTES = 2 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Loads events for the given filter set. Uses a tighter 2min staleTime than
 * news (events are more time-sensitive and the user often tweaks filters
 * back-to-back), with a 1hr GC window so revisiting a filter combo within a
 * session is instant.
 */
export function useEventsQuery(filters: EventFilters) {
  return useQuery<EventFetchResult, Error>({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventService.getEvents(filters),
    staleTime: TWO_MINUTES,
    gcTime: FIFTEEN_MINUTES * 4,
  });
}
