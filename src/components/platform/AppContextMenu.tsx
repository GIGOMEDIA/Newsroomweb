import React, { createContext, useContext } from "react";

type MenuItem = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type ShowMenuParams = {
  x: number;
  y: number;
  items: MenuItem[];
};

type ContextType = {
  showMenu: (params: ShowMenuParams) => void;
};

const AppContextMenuContext = createContext<ContextType | null>(null);

export function AppContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const showMenu = ({ items }: ShowMenuParams) => {
    // SIMPLE fallback (no UI, just logs)
    console.log("Context Menu:");
    items.forEach((item) => {
      if (!item.disabled) {
        console.log("-", item.label);
      }
    });
  };

  return (
    <AppContextMenuContext.Provider value={{ showMenu }}>
      {children}
    </AppContextMenuContext.Provider>
  );
}

export function useAppContextMenu() {
  const context = useContext(AppContextMenuContext);

  if (!context) {
    throw new Error(
      "useAppContextMenu must be used inside AppContextMenuProvider"
    );
  }

  return context;
}

// helpers used in your cards
export function copyText(text?: string) {
  if (!text) return;
  navigator.clipboard?.writeText(text);
}

export function getContextPoint(e: any) {
  return {
    x: e?.clientX || 0,
    y: e?.clientY || 0,
  };
}