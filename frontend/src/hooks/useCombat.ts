import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { EMOJIS } from '../../../constants/emojis';

export interface Character {
  id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  element: keyof typeof EMOJIS.ELEMENTS;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
  };
  equipment: {
    weapon?: string;
    armor?: string;
    accessory?: string;
  };
  skills: Skill[];
  status: {
    type: 'normal' | 'buffed' | 'debuffed' | 'poisoned' | 'frozen';
    emoji: string;
    duration?: number;
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  damage: number;
  energyCost: number;
  cooldown: number;
  element: keyof typeof EMOJIS.ELEMENTS;
  emoji: string;
  effects?: Array<{
    type: 'buff' | 'debuff' | 'dot' | 'hot';
    value: number;
    duration: number;
  }>;
}

export interface Battle {
  id: string;
  type: 'pvp' | 'pve' | 'raid';
  status: 'waiting' | 'active' | 'finished';
  participants: Character[];
  turns: Array<{
    characterId: string;
    action: {
      type: 'attack' | 'skill' | 'item';
      targetId: string;
      skillId?: string;
      itemId?: string;
    };
    result: {
      damage?: number;
      healing?: number;
      effects?: string[];
      emoji: string;
    };
  }>;
  rewards?: {
    experience: number;
    items: Array<{
      id: string;
      quantity: number;
    }>;
  };
}

export const useCharacter = (characterId: string) => {
  return useQuery<Character>({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/combat/characters/${characterId}`);
      return data;
    },
  });
};

export const useActiveBattle = () => {
  return useQuery<Battle>({
    queryKey: ['active-battle'],
    queryFn: async () => {
      const { data } = await apiClient.get('/combat/active-battle');
      return data;
    },
  });
};

export const useJoinBattle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (battleId: string) => {
      const { data } = await apiClient.post(`/combat/battles/${battleId}/join`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-battle'] });
    },
  });
};

export const useBattleAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      battleId,
      action,
    }: {
      battleId: string;
      action: {
        type: 'attack' | 'skill' | 'item';
        targetId: string;
        skillId?: string;
        itemId?: string;
      };
    }) => {
      const { data } = await apiClient.post(`/combat/battles/${battleId}/action`, action);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-battle'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
};
