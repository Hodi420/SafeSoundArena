import '../index.css';
import type { AppProps } from 'next/app';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { PageTransition } from '../components/PageTransition';
import { RouteChangeLoader } from '../components/RouteChangeLoader';
import { RouteChangeProgress } from '../components/RouteChangeProgress';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const disableTransition = (Component as any).disableTransition;
  const pageTransitionProps = (Component as any).pageTransitionProps || {};
  const { ToastProvider } = require('../components/ToastContext');
  const isJailTime = router.pathname === '/jail-time';
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
  return isJailTime ? content : <ToastProvider>{content}</ToastProvider>;

}

export default MyApp;
