import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  participants: number;
  type: string;
  status: string;
  rewards: Array<{ amount: number; type: string }>;
  emoji: string;
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Test Event',
    description: 'A fun test event',
    startTime: new Date(),
    endTime: new Date(),
    capacity: 100,
    participants: 10,
    type: 'conference',
    status: 'upcoming',
    rewards: [{ amount: 10, type: 'Pi' }],
    emoji: '🎪',
  },
];

export const useEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/events');
        return data ?? mockEvents;
      } catch (err) {
        return mockEvents;
      }
    },
    suspense: false,
    experimental_prefetchInRender: false,
  });
};

export const useJoinEvent = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.EVENTS.JOIN(eventId));
      return data;
    },
  });
};

export const useLeaveEvent = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.EVENTS.LEAVE(eventId));
      return data;
    },
  });
};
