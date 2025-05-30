import '../index.css';
import type { AppProps } from 'next/app';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
<<<<<<< HEAD
import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import { PageTransition } from '../components/PageTransition';
import { RouteChangeLoader } from '../components/RouteChangeLoader';
import { RouteChangeProgress } from '../components/RouteChangeProgress';
import { initGA, trackPageView } from '../lib/analytics';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const disableTransition = (Component as { disableTransition?: boolean }).disableTransition;
  const pageTransitionProps = (Component as { pageTransitionProps?: object }).pageTransitionProps || {};
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ToastProvider } = require('../components/ToastContext');
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

=======
import { PageTransition } from '../components/PageTransition';
import { RouteChangeLoader } from '../components/RouteChangeLoader';
import { RouteChangeProgress } from '../components/RouteChangeProgress';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const disableTransition = (Component as any).disableTransition;
  const pageTransitionProps = (Component as any).pageTransitionProps || {};
  const { ToastProvider } = require('../components/ToastContext');
  const isJailTime = router.pathname === '/jail-time';
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
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
<<<<<<< HEAD
  return isJailTime ? content : (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>{content}</ToastProvider>
    </ThemeProvider>
  );
}


=======
  return isJailTime ? content : <ToastProvider>{content}</ToastProvider>;

}

>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
export default MyApp;
