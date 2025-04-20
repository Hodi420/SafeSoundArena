import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { EMOJIS } from '../../../constants/emojis';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'cosmetic';
  emoji: string;
  attributes?: {
    damage?: number;
    defense?: number;
    healing?: number;
    duration?: number;
  };
  tradeable: boolean;
  craftable: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: Array<{
    itemId: string;
    quantity: number;
  }>;
  result: {
    itemId: string;
    quantity: number;
  };
  difficulty: keyof typeof EMOJIS.DIFFICULTY;
  emoji: string;
}

export const useInventory = () => {
  import { InventoryItem } from '../../types/api';

return useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data } = await apiClient.get('/inventory');
      return data as InventoryItem[];
    },
  });
};

export const useItem = (itemId: string) => {
  return useQuery<InventoryItem>({
    queryKey: ['item', itemId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/inventory/items/${itemId}`);
      return data;
    },
  });
};

export const useRecipes = () => {
  return useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/inventory/recipes');
      return data;
    },
  });
};

export const useCraftItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { data } = await apiClient.post(`/inventory/craft/${recipeId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useTradeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
      targetUserId,
      price,
    }: {
      itemId: string;
      quantity: number;
      targetUserId: string;
      price?: number;
    }) => {
      const { data } = await apiClient.post('/inventory/trade', {
        itemId,
        quantity,
        targetUserId,
        price,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
