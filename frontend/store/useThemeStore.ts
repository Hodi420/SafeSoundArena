import create from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  font: 'fira-code' | 'orbitron' | 'rajdhani';
  primaryColor: string;
  secondaryColor: string;
  uiStyle: 'cyberpunk' | 'minimal' | 'retro';
  animationSpeed: 'fast' | 'normal' | 'slow';
  neonIntensity: number;
  setFont: (font: ThemeState['font']) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setUiStyle: (style: ThemeState['uiStyle']) => void;
  setAnimationSpeed: (speed: ThemeState['animationSpeed']) => void;
  setNeonIntensity: (intensity: number) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      font: 'fira-code',
      primaryColor: '#3b82f6',
      secondaryColor: '#9333ea',
      uiStyle: 'cyberpunk',
      animationSpeed: 'normal',
      neonIntensity: 1,
      setFont: (font) => set({ font }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setSecondaryColor: (secondaryColor) => set({ secondaryColor }),
      setUiStyle: (uiStyle) => set({ uiStyle }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      setNeonIntensity: (neonIntensity) => set({ neonIntensity }),
    }),
    {
      name: 'pioneer-pathways-theme',
    }
  )
);
