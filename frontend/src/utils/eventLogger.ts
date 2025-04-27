import { useRoom } from '../context/RoomContext';

export interface LogEvent {
  type: string;
<<<<<<< HEAD
  payload: Record<string, unknown>;
=======
  payload: any;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  userId?: string;
  roomId: string;
  timestamp: string;
}

export async function logEvent(event: Omit<LogEvent, 'timestamp'>) {
  const log: LogEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  try {
    await fetch('/api/logEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  } catch (err) {
    // Optionally handle/log error
    console.error('Failed to log event', err);
  }
}
