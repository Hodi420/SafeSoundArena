import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  participants: number;
  type: 'conference' | 'challenge' | 'tournament' | 'social';
  status: 'upcoming' | 'active' | 'ended';
  rewards: {
    amount: number;
    type: 'Pi' | 'XP' | 'NFT';
  }[];
  emoji: string;
}

export const useEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.EVENTS.LIST);
      return data as Event[];
    },
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
