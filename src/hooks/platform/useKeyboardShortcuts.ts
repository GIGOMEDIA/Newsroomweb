import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

type ShortcutAction =
  | 'back'
  | 'bookmark'
  | 'events'
  | 'feed'
  | 'refresh'
  | 'saved'
  | 'search';

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

const routeForAction: Partial<Record<ShortcutAction, string>> = {
  events: '/events',
  feed: '/',
  saved: '/saved',
  search: '/search',
};

const runAction = (action: ShortcutAction, handlers?: ShortcutHandlers) => {
  const handled = handlers?.[action];
  if (handled) {
    handled();
    return;
  }

  const route = routeForAction[action];
  if (route) {
    router.push(route as Parameters<typeof router.push>[0]);
  } else if (action === 'back') {
    router.back();
  }
};

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      let action: ShortcutAction | null = null;

      if (modifier && event.key === '1') action = 'feed';
      if (modifier && event.key === '2') action = 'events';
      if (modifier && event.key === '3') action = 'search';
      if (modifier && event.key === '4') action = 'saved';
      if (modifier && event.key.toLowerCase() === 'k') action = 'search';
      if (modifier && event.key.toLowerCase() === 'r') action = 'refresh';
      if (modifier && event.key.toLowerCase() === 'b') action = 'bookmark';
      if (event.key === 'Escape') action = 'back';

      if (!action) {
        return;
      }

      event.preventDefault();
      runAction(action, handlers);
    };

    const onMenuAction = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: ShortcutAction }>).detail;
      if (!detail?.action) {
        return;
      }
      runAction(detail.action, handlers);
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('crednews:menu-action', onMenuAction);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('crednews:menu-action', onMenuAction);
    };
  }, [handlers]);
}
