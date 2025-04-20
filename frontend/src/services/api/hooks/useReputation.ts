import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../../../components/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { Reputation, FactionReputation } from '../../types/api';

/**
 * useFactions - advanced navigation logic for FactionSelector.
 * - Provides navigation to faction pages and fetches faction reputation data.
 * - Includes toast notifications for user feedback during navigation.
 * - Handles data fetching for factions with error handling.
 */
export function useFactions() {
  const router = useRouter();
  const toast = useToast();

  // Placeholder faction list
  const factions = [
    { id: '1', name: 'Faction One' },
    { id: '2', name: 'Faction Two' },
    { id: '3', name: 'Faction Three' },
  ];

  /**
   * Navigate to /factions/[id] with optional query params and callback
   * @param id - Faction ID
   * @param options - { query?: object, onComplete?: () => void }
   */
  const goToFactionPage = useCallback(
    (
      id: string,
      options?: {
        query?: Record<string, string>;
        onComplete?: () => void;
      }
    ) => {
      toast.showToast(`Navigating to Faction ${id}...`, 'info');
      const query = options?.query ? new URLSearchParams(options.query).toString() : '';
      const url = `/factions/${id}${query ? `?${query}` : ''}`;
      router.push(url).then(() => {
        if (options?.onComplete) options.onComplete();
      });
    },
    [router, toast]
  );

  // Fetch faction reputation data
  const factionsQuery = useQuery<FactionReputation[]>({
    queryKey: ['factionsReputation'],
    queryFn: async (): Promise<FactionReputation[]> => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.REPUTATION.FACTIONS);
        return data as FactionReputation[];
      } catch (error) {
        toast.showToast('Failed to load faction data', 'error');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { factions, goToFactionPage, factionsReputation: factionsQuery };
}

/**
 * Hook to fetch user reputation data with error handling.
 * @param userId - The ID of the user to fetch reputation for.
 * @returns Query result with reputation data.
 */
export function useUserReputation(userId: string) {
  const toast = useToast();
  return useQuery<Reputation>({
    queryKey: ['userReputation', userId],
    queryFn: async (): Promise<Reputation> => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.REPUTATION.USER(userId));
        return data as Reputation;
      } catch (error) {
        toast.showToast('Failed to load reputation data', 'error');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!userId, // Only fetch if userId is provided
  });
}
