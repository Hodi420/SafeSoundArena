import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  progress: number;
  goal: number;
  claimed: boolean;
  emoji: string;
  reward: {
    type: string;
    amount: number;
    emoji: string;
  };
}

export const useDailyChallenges = () => {
  return useQuery<Challenge[]>({
    queryKey: ['challenges', 'daily'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CHALLENGES.DAILY);
      return data;
    },
  });
};

export const useWeeklyChallenges = () => {
  return useQuery<Challenge[]>({
    queryKey: ['challenges', 'weekly'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CHALLENGES.WEEKLY);
      return data;
    },
  });
};

export const useClaimChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.CHALLENGES.CLAIM(challengeId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['challenges', 'weekly'] });
    },
  });
};
