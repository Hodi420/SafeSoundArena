import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Profile {
  id: string;
  username: string;
  level: number;
  rank: string;
  achievements: Achievement[];
  avatar: string;
  status: '🌟 Online' | '😴 Away' | '🎮 Gaming' | '🔍 Exploring';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  emoji: '🏆' | '⭐' | '💫' | '👑'; // Achievement rarity emoji
  unlockedAt?: Date;
}

export interface LeaderboardEntry {
  position: number;
  profile: Profile;
  score: number;
  trend: '📈' | '📉' | '➡️'; // Trend emoji
}

export const useProfile = (userId: string) => {
  return useQuery<Profile>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SOCIAL.PROFILE(userId));
      return data;
    },
  });
};

export const useLeaderboard = () => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SOCIAL.LEADERBOARD);
      return data;
    },
  });
};

export const useAchievements = () => {
  return useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SOCIAL.ACHIEVEMENTS);
      return data;
    },
  });
};
