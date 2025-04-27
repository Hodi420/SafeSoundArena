import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface MiniGame {
  id: string;
  type: 'puzzle' | 'card' | 'arcade' | 'quiz';
  name: string;
  description: string;
  difficulty: number;
  rewards: {
    experience: number;
    currency: number;
    items?: Array<{
      id: string;
      quantity: number;
    }>;
  };
  highScores: Array<{
    userId: string;
    username: string;
    score: number;
    date: string;
  }>;
  emoji: '🎮' | '🎲' | '🎯' | '🧩';
  status: 'available' | 'maintenance' | 'special-event';
}

export interface GameSession {
  id: string;
  gameId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  score: number;
  actions: Array<{
    type: string;
    timestamp: string;
<<<<<<< HEAD
    data: Record<string, unknown>;
=======
    data: any;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  }>;
  status: 'active' | 'completed' | 'abandoned';
}

export const useMiniGames = () => {
  import { MiniGame } from '../../types/api';

return useQuery<MiniGame[]>({
    queryKey: ['mini-games'],
    queryFn: async (): Promise<MiniGame[]> => {
      const { data } = await apiClient.get('/mini-games');
      return data as MiniGame[];
    },
  });
};

export const useGameSession = (sessionId: string) => {
  return useQuery<GameSession>({
    queryKey: ['game-session', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/mini-games/sessions/${sessionId}`);
      return data;
    },
    enabled: !!sessionId,
  });
};

export const useStartGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      const { data } = await apiClient.post(`/mini-games/${gameId}/start`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['game-session', data.id], data);
    },
  });
};

export const useGameAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      action,
    }: {
      sessionId: string;
      action: {
        type: string;
<<<<<<< HEAD
        data: Record<string, unknown>;
=======
        data: any;
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
      };
    }) => {
      const { data } = await apiClient.post(`/mini-games/sessions/${sessionId}/action`, action);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['game-session', variables.sessionId], data);
    },
  });
};

export const useEndGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      score,
    }: {
      sessionId: string;
      score: number;
    }) => {
      const { data } = await apiClient.post(`/mini-games/sessions/${sessionId}/end`, { score });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mini-games'] });
      queryClient.invalidateQueries({ queryKey: ['game-session', variables.sessionId] });
    },
  });
};
