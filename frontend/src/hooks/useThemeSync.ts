import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

export function useThemeSync() {
  const {
    isDarkMode,
    primaryColor,
    secondaryColor,
    neonIntensity
  } = useThemeStore();

  useEffect(() => {
    // Convert hex to RGB for CSS variables
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : null;
    };

    // Update CSS variables
    document.documentElement.style.setProperty('--user-neon-intensity', neonIntensity.toString());
    document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb(primaryColor));
    document.documentElement.style.setProperty('--secondary-color-rgb', hexToRgb(secondaryColor));
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, primaryColor, secondaryColor, neonIntensity]);
} 