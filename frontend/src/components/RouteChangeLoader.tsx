import React from 'react';
import { useRouter } from 'next/router';
import { LoadingSpinner } from './LoadingSpinner';

export const RouteChangeLoader: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleEnd = () => setLoading(false);
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleEnd);
    router.events.on('routeChangeError', handleEnd);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleEnd);
      router.events.off('routeChangeError', handleEnd);
    };
  }, [router]);

  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-gray-900/70 pointer-events-none transition-opacity">
      <LoadingSpinner />
    </div>
  );
};
