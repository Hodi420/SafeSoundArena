import { useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

let socket: ReturnType<typeof io> | null = null;

export function useJailTime(profile: Record<string, unknown>) {
  const router = useRouter();

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const activeSocket = socket ?? (socket = io(socketUrl));

    const handleChillStatus = ({ active }: { active: boolean }) => {
      if (active && router.pathname !== '/jail') {
        router.replace('/jail');
      }
      if (!active && router.pathname === '/jail') {
        router.replace('/');
      }
    };

    activeSocket.on('jailStatus', handleChillStatus);

    // Initial check
    fetch('/api/jail-status')
      .then(res => res.json())
      .then(({ active }) => {
        if (active && router.pathname !== '/jail') {
          router.replace('/jail');
        }
      });

    // Join jail room with profile
    if (profile && router.pathname === '/jail') {
      activeSocket.emit('joinJail', profile);
    }

    return () => {
      activeSocket.off('jailStatus', handleChillStatus);
      if (profile && router.pathname === '/jail') {
        activeSocket.emit('leaveJail');
      }
    };
  }, [router, profile]);
}
