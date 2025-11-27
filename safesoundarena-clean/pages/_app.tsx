import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // Establish basic CSS variables from theme store on client
  useEffect(() => {
    // dynamic import to avoid SSR issues
    import('../store/useThemeStore')
      .then(({ useThemeStore }) => {
        const { primaryColor, secondaryColor, font } = useThemeStore.getState();
        const root = document.documentElement;
        root.style.setProperty('--primary-color', primaryColor);
        root.style.setProperty('--secondary-color', secondaryColor);
        root.classList.add(font);
      })
      .catch(() => {});
  }, []);

  return <Component {...pageProps} />;
}
