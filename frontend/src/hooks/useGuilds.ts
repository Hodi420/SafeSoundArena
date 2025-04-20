import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Guild {
  id: string;
  name: string;
  description: string;
  emoji: string;
  members: number;
  leader: string;
  rank: string;
}

export interface GuildMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  emoji: string;
}

export const useGuilds = () => {
  import { Guild } from '../../types/api';

return useQuery<Guild[]>({
    queryKey: ['guilds'],
    queryFn: async (): Promise<Guild[]> => {
      const { data } = await apiClient.get(API_ENDPOINTS.GUILDS.LIST);
      return data as Guild[];
    },
  });
};

export const useGuildDetails = (guildId: string) => {
  return useQuery<Guild>({
    queryKey: ['guild', guildId],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.GUILDS.DETAILS(guildId));
      return data;
    },
  });
};

export const useJoinGuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guildId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.GUILDS.JOIN(guildId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
    },
  });
};

export const useLeaveGuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guildId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.GUILDS.LEAVE(guildId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
    },
  });
};

export const useGuildMessages = (guildId: string) => {
  return useQuery<GuildMessage[]>({
    queryKey: ['guild-messages', guildId],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.GUILDS.MESSAGE(guildId));
      return data;
    },
    enabled: !!guildId,
    refetchInterval: 10000,
  });
};
