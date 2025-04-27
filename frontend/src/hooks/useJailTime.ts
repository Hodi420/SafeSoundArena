import { useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

let socket: ReturnType<typeof io> | null = null;

<<<<<<< HEAD
export function useJailTime(profile: Record<string, unknown>) {
=======
export function useJailTime(profile: any) {
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  const router = useRouter();

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:4000');
    }

    const handleChillStatus = ({ active }: { active: boolean }) => {
      if (active && router.pathname !== '/jail') {
        router.replace('/jail');
      }
      if (!active && router.pathname === '/jail') {
        router.replace('/');
      }
    };

    socket.on('jailStatus', handleChillStatus);

    // Initial check
    fetch('http://localhost:4000/api/jail-status')
      .then(res => res.json())
      .then(({ active }) => {
        if (active && router.pathname !== '/jail') {
          router.replace('/jail');
        }
      });

    // Join jail room with profile
    if (profile && router.pathname === '/jail') {
      socket.emit('joinChill', profile);
    }

    return () => {
      socket?.off('jailStatus', handleChillStatus);
      if (profile && router.pathname === '/jail') {
        socket.emit('leaveChill');
      }
    };
  }, [router, profile]);
}
