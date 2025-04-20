import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  reputation: number;
  coins: number;
  joinedAt: string;
  avatarUrl?: string;
  // add more fields as needed
}

export function useUserProfile(userId: string) {
  return useQuery<UserProfile>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.USER.PROFILE(userId));
      return data as UserProfile;
    },
    enabled: !!userId,
  });
}
