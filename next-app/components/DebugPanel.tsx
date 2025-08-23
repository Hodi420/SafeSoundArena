import { useState, useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../store/useThemeStore';

function useZustandSnapshot() {
  // This will re-render on every store change
  const store = useThemeStore();
  return store;
}


export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [buildTime, setBuildTime] = useState<string | null>(null);
  const [viewport, setViewport] = useState<string | null>(null);
  const [userAgent, setUserAgent] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const zustandState = useZustandSnapshot();

  useEffect(() => {
    setBuildTime(new Date().toLocaleString());
    if (typeof window !== 'undefined') {
      setViewport(`${window.innerWidth}x${window.innerHeight}`);
      setUserAgent(navigator.userAgent);
    }
  }, []);

  return (
    <>
      {/* Always-on, large Debug Panel sidebar */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[90vw] md:w-[60vw] lg:w-[40vw] bg-gray-900 text-white p-8 z-[1000] border-l-8 border-pink-500 shadow-2xl overflow-y-auto"
        style={{ fontSize: '1.1rem', maxWidth: '100vw' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-pink-400 text-3xl">Debug Panel</span>
          {/* Close button removed to force always-on */}
        </div>

        <section className="mb-8">
          <div className="font-bold text-blue-400 text-xl mb-2">Zustand Store Snapshot</div>
          <pre className="bg-gray-800 rounded p-4 text-base overflow-x-auto">
            {JSON.stringify(zustandState, null, 2)}
          </pre>
        </section>

        <section className="mb-8">
          <div className="font-bold text-green-400 text-xl mb-2">React Query Cache</div>
          <pre className="bg-gray-800 rounded p-4 text-base overflow-x-auto">
            {JSON.stringify(queryClient.getQueryCache().findAll().map(q => ({
              queryKey: q.queryKey,
              state: q.state
            })), null, 2)}
          </pre>
        </section>

        <section className="mb-8">
          <div className="font-bold text-yellow-400 text-xl mb-2">App Info</div>
          <ul className="text-base">
            <li>Build Time: {buildTime ?? ''}</li>
            <li>Viewport: {viewport ?? ''}</li>
            <li>User Agent: {userAgent ?? ''}</li>
          </ul>
        </section>

        <div className="mt-8">
          <ReactQueryDevtools initialIsOpen={true} />
        </div>
      </div>
    </>
  );
}
