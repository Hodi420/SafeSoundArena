import '../index.css';
import type { AppProps } from 'next/app';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import { PageTransition } from '../components/PageTransition';
import { RouteChangeLoader } from '../components/RouteChangeLoader';
import { RouteChangeProgress } from '../components/RouteChangeProgress';
import { ToastProvider } from '../components/ToastContext';
import { initGA, trackPageView } from '../lib/analytics';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const disableTransition = (Component as { disableTransition?: boolean }).disableTransition;
  const pageTransitionProps = (Component as { pageTransitionProps?: object }).pageTransitionProps || {};
  const isJailTime = router.pathname === '/jail-time';

  // Google Analytics: Initialize once and track page views
  useEffect(() => {
    initGA();
    trackPageView(window.location.pathname);
    const handleRouteChange = (url: string) => trackPageView(url);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
 
  const content = (
    <>
      <RouteChangeProgress />
      <RouteChangeLoader />
      <AnimatePresence mode="wait" initial={false}>
        {disableTransition ? (
          <Component {...pageProps} key={router.pathname} />
        ) : (
          <PageTransition key={router.pathname} {...pageTransitionProps}>
            <Component {...pageProps} />
          </PageTransition>
        )}
      </AnimatePresence>
    </>
  );
  const wrappedContent = (
    <ToastProvider>{content}</ToastProvider>
  );

  return isJailTime ? wrappedContent : (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {wrappedContent}
    </ThemeProvider>
  );
}
 
export default MyApp;
