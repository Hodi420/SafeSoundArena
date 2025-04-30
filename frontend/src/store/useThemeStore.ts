// useThemeStore.ts
// Zustand store for managing theme (dark/light mode) across the app
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeFont = 'fira-code' | 'orbitron' | 'rajdhani';
export type ThemeStyle = 'cyberpunk' | 'minimal' | 'retro';
export type AnimationSpeed = 'fast' | 'normal' | 'slow';

interface ThemeState {
  isDarkMode: boolean;
  font: ThemeFont;
  primaryColor: string;
  secondaryColor: string;
  uiStyle: ThemeStyle;
  animationSpeed: AnimationSpeed;
  neonIntensity: number;
  toggleTheme: () => void;
  setFont: (font: ThemeFont) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setUiStyle: (style: ThemeStyle) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setNeonIntensity: (intensity: number) => void;
}

/**
 * useThemeStore - Zustand store for theme mode (dark/light)
 * Usage: const { isDarkMode, toggleTheme } = useThemeStore();
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      font: 'fira-code',
      primaryColor: '#0ea5e9',
      secondaryColor: '#d946ef',
      uiStyle: 'cyberpunk',
      animationSpeed: 'normal',
      neonIntensity: 1,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setFont: (font) => set({ font }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setSecondaryColor: (secondaryColor) => set({ secondaryColor }),
      setUiStyle: (uiStyle) => set({ uiStyle }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      setNeonIntensity: (neonIntensity) => set({ neonIntensity }),
    }),
    {
      name: 'safesound-theme-storage',
      version: 1,
    }
  )
);
