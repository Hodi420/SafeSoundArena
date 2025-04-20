// useThemeStore.ts
// Zustand store for managing theme (dark/light mode) across the app
import { create } from 'zustand';

interface ThemeStoreState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

/**
 * useThemeStore - Zustand store for theme mode (dark/light)
 * Usage: const { isDarkMode, toggleTheme } = useThemeStore();
 */
export const useThemeStore = create<ThemeStoreState>((set) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
