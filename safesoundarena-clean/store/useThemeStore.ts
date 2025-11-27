import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeFont = 'fira-code' | 'orbitron' | 'rajdhani';
export type ThemeStyle = 'cyberpunk' | 'minimal' | 'retro' | 'arena' | 'stealth' | 'holographic';
export type AnimationSpeed = 'fast' | 'normal' | 'slow';

interface ThemeState {
  font: ThemeFont;
  primaryColor: string;
  secondaryColor: string;
  uiStyle: ThemeStyle;
  animationSpeed: AnimationSpeed;
  neonIntensity: number;
  setFont: (font: ThemeFont) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setUiStyle: (style: ThemeStyle) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setNeonIntensity: (intensity: number) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      font: 'fira-code',
      primaryColor: '#0ea5e9',
      secondaryColor: '#d946ef',
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
      name: 'safesoundarena-clean-theme',
      version: 1,
    }
  )
);
