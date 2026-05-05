import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fontFamily } from '@/utils/typography';

export type ContextMenuItem = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

type MenuState = {
  items: ContextMenuItem[];
  x: number;
  y: number;
};

type AppContextMenuValue = {
  hideMenu: () => void;
  showMenu: (state: MenuState) => void;
};

const AppContextMenu = createContext<AppContextMenuValue | null>(null);

export function AppContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const hideMenu = useCallback(() => setMenu(null), []);
  const showMenu = useCallback((state: MenuState) => {
    if (Platform.OS !== 'web') {
      return;
    }
    setMenu(state);
  }, []);

  return (
    <AppContextMenu.Provider value={{ hideMenu, showMenu }}>
      <View style={styles.root}>
        {children}
        {menu ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={hideMenu}>
            <View style={[styles.menu, { left: menu.x, top: menu.y }]}>
              {menu.items.map((item) => (
                <Pressable
                  key={item.label}
                  disabled={item.disabled}
                  style={(state) => [
                    styles.menuItem,
                    (state as { hovered?: boolean }).hovered &&
                      styles.menuItemHover,
                    state.pressed && styles.menuItemPressed,
                    item.disabled && styles.menuItemDisabled,
                  ]}
                  onPress={() => {
                    hideMenu();
                    item.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      item.disabled && styles.menuItemTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        ) : null}
      </View>
    </AppContextMenu.Provider>
  );
}

export function useAppContextMenu() {
  const menu = useContext(AppContextMenu);
  if (!menu) {
    throw new Error('useAppContextMenu must be used inside AppContextMenuProvider');
  }
  return menu;
}

export const copyText = async (text: string) => {
  if (!text) return;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    await navigator.clipboard?.writeText(text);
  }
};

export const getContextPoint = (event: unknown) => {
  const nativeEvent = (event as { nativeEvent?: Record<string, number> }).nativeEvent;
  return {
    x: nativeEvent?.clientX ?? nativeEvent?.pageX ?? 24,
    y: nativeEvent?.clientY ?? nativeEvent?.pageY ?? 24,
  };
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  menu: {
    backgroundColor: '#101217',
    borderColor: '#292C34',
    borderWidth: 1,
    minWidth: 184,
    paddingVertical: 5,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  menuItem: {
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuItemHover: {
    backgroundColor: '#1A1D24',
  },
  menuItemPressed: {
    backgroundColor: '#242832',
  },
  menuItemText: {
    color: '#E8E8ED',
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  menuItemTextDisabled: {
    color: '#74747E',
  },
});
