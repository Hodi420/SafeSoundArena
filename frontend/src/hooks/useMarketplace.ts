import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  seller: string;
  quantity: number;
  rarity: string;
  type: string;
}

/**
 * useMarketplace - Fetches the marketplace items, with error and loading states.
 * @returns { data, error, isLoading } for use in components
 */
export const useMarketplace = () => {
  // Fetch marketplace items and provide error/loading states
  return useQuery<MarketItem[]>({
    queryKey: ['marketplace'],
    queryFn: async (): Promise<MarketItem[]> => {
      const { data } = await apiClient.get(API_ENDPOINTS.MARKETPLACE.LIST);
      return data as MarketItem[];
    },
  });
};

export const useBuyItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.MARKETPLACE.BUY(itemId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
};

export const useSellItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, quantity, price }: { itemId: string; quantity: number; price: number }) => {
      const { data } = await apiClient.post(API_ENDPOINTS.MARKETPLACE.SELL(itemId), { quantity, price });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
};
