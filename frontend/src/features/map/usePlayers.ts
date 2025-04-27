import { useEffect, useRef, useState } from 'react';
import { Player } from './types';

/**
 * usePlayers - Real-time player data hook.
 *
 * If wsUrl is provided, connects to a WebSocket for instant updates.
 * Otherwise, polls the REST endpoint every 2s.
 * Only updates state if data changes, to minimize re-renders.
 * Handles loading and error states robustly.
 *
 * @param jsonUrl - The URL to fetch player data from (REST API or static JSON)
 * @param wsUrl - (optional) WebSocket URL for real-time updates
 */
export function usePlayers(jsonUrl: string, wsUrl?: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let interval: NodeJS.Timeout | null = null;

    // WebSocket logic
    if (wsUrl) {
      setLoading(true);
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setLoading(false);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const dataString = JSON.stringify(data);
          if (dataString !== lastDataRef.current) {
            lastDataRef.current = dataString;
            if (isMounted) setPlayers(data);
          }
          if (isMounted) setError(null);
<<<<<<< HEAD
        } catch (e: unknown) {
          if (e instanceof Error) {
            if (isMounted) setError(e.message);
          } else {
            if (isMounted) setError('Invalid WebSocket data');
          }
=======
        } catch (e: any) {
          if (isMounted) setError('Invalid WebSocket data');
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
        }
      };
      ws.onerror = (e) => {
        if (isMounted) setError('WebSocket error');
      };
      ws.onclose = () => {
        if (isMounted) setError('WebSocket closed');
      };
    } else {
      // Polling fallback
      const fetchPlayers = () => {
        fetch(jsonUrl)
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch players');
            return res.json();
          })
          .then((data) => {
            const dataString = JSON.stringify(data);
            if (dataString !== lastDataRef.current) {
              lastDataRef.current = dataString;
              if (isMounted) setPlayers(data);
            }
            if (isMounted) setError(null);
          })
          .catch((e) => {
            if (isMounted) setError(e.message);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      };
      fetchPlayers();
      interval = setInterval(fetchPlayers, 2000);
    }

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (interval) clearInterval(interval);
    };
  }, [jsonUrl, wsUrl]);

  return { players, loading, error };
}

