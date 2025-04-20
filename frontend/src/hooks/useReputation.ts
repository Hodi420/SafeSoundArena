import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Faction {
  id: string;
  name: string;
  description: string;
  emoji: string;
  reputation: number;
  rank: string;
}

export interface Reputation {
  userId: string;
  factions: Faction[];
  total: number;
  rank: string;
}

export const useReputation = (userId: string) => {
  import { Reputation } from '../../types/api';

return useQuery<Reputation>({
    queryKey: ['reputation', userId],
    queryFn: async (): Promise<Reputation> => {
      const { data } = await apiClient.get(API_ENDPOINTS.REPUTATION.USER(userId));
      return data as Reputation;
    },
  });
};

export const useFactions = () => {
  return useQuery<Faction[]>({
    queryKey: ['factions'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.REPUTATION.FACTIONS);
      return data;
    },
  });
};
