import create from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  font: 'fira-code' | 'orbitron' | 'rajdhani';
  primaryColor: string;
  secondaryColor: string;
  uiStyle: 'cyberpunk' | 'minimal' | 'retro';
  animationSpeed: 'fast' | 'normal' | 'slow';
  setFont: (font: ThemeState['font']) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setUiStyle: (style: ThemeState['uiStyle']) => void;
  setAnimationSpeed: (speed: ThemeState['animationSpeed']) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      font: 'fira-code',
      primaryColor: '#3b82f6',
      secondaryColor: '#9333ea',
      uiStyle: 'cyberpunk',
      animationSpeed: 'normal',
      setFont: (font) => set({ font }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setSecondaryColor: (secondaryColor) => set({ secondaryColor }),
      setUiStyle: (uiStyle) => set({ uiStyle }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
    }),
    {
      name: 'pioneer-pathways-theme',
    }
  )
);
