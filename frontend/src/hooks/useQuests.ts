import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  progress: number;
  status: 'active' | 'completed' | 'locked';
  requirements: string[];
  emoji: string; // Quest category emoji
}

export const useQuests = () => {
  return useQuery<Quest[]>({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.QUESTS.LIST);
      return data;
    },
  });
};

export const useQuestDetails = (questId: string) => {
  return useQuery<Quest>({
    queryKey: ['quest', questId],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.QUESTS.DETAILS(questId));
      return data;
    },
  });
};

export const useUpdateQuestProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questId, progress }: { questId: string; progress: number }) => {
      const { data } = await apiClient.post(API_ENDPOINTS.QUESTS.PROGRESS(questId), { progress });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quest', variables.questId] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
};
