import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  timestamp: string;
  emoji: string;
}

export const useNotifications = () => {
  import { Notification } from '../../types/api';

return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const { data } = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
      return data as Notification[];
    },
    refetchInterval: 15000,
  });
};

export const useReadNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.READ(notificationId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useReadAllNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.ALL_READ);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
