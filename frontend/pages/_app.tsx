import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import '../styles/theme.css';
import type { AppProps } from 'next/app';
import { useJailTime } from '../src/hooks/useJailTime';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import { useThemeSync } from '../src/hooks/useThemeSync';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExternalSDKs from '../src/lib/ExternalSDKs';
// Only import devtools and DebugPanel in dev or sandbox
const isDevOrSandbox = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
import DebugPanel from '../src/components/DebugPanel';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Import fonts
import '@fontsource/fira-code';
import '@fontsource/orbitron';
import '@fontsource/rajdhani';

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  const [queryClient] = useState(() => new QueryClient());
  const { font, uiStyle, animationSpeed } = useThemeStore();
  
  useThemeSync();

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`font-${font} theme-${uiStyle} animation-${animationSpeed}`}>
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  );
};

export default App;
