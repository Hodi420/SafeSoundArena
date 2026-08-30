import React, { useState } from 'react';
import '../styles/globals.css';
import '../styles/theme.css';
import type { AppProps } from 'next/app';
import { ToastProvider } from '../src/components/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import fonts
import '@fontsource/fira-code';
import '@fontsource/orbitron';
import '@fontsource/rajdhani';

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
