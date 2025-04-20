import { useEffect, useState } from 'react';

// This hook simulates live notifications via polling the backend dispatch API (in-app channel)
export function useLiveNotifications(userId: string) {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    let lastCheck = Date.now();

    async function poll() {
      try {
        // In a real system, replace this with a websocket or SSE for true real-time
        const res = await fetch(`/api/ai/in-app-notifications?userId=${userId}&since=${lastCheck}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.notifications)) {
            setNotifications((prev) => [...prev, ...data.notifications]);
            lastCheck = Date.now();
          }
        }
      } catch (err) {
        // Ignore errors for now
      }
      if (isMounted) setTimeout(poll, 3000); // Poll every 3s
    }
    poll();
    return () => { isMounted = false; };
  }, [userId]);

  return notifications;
}
