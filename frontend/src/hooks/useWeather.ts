import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { EMOJIS } from '../../../constants/emojis';

export interface WeatherState {
  current: keyof typeof EMOJIS.WEATHER;
  forecast: Array<{
    time: string;
    type: keyof typeof EMOJIS.WEATHER;
    effects: Array<{
      type: 'buff' | 'debuff';
      target: 'player' | 'environment' | 'quests';
      value: number;
      description: string;
    }>;
  }>;
  events: Array<{
    type: 'storm' | 'rainbow' | 'aurora' | 'meteor';
    start: string;
    duration: number;
    rewards: Array<{
      type: string;
      amount: number;
      emoji: string;
    }>;
  }>;
  areas: Array<{
    id: string;
    name: string;
    weather: keyof typeof EMOJIS.WEATHER;
    elementalBonus: keyof typeof EMOJIS.ELEMENTS;
  }>;
}

export const useWeather = () => {
  return useQuery<WeatherState>({
    queryKey: ['weather'],
    queryFn: async () => {
      const { data } = await apiClient.get('/weather');
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useAreaWeather = (areaId: string) => {
  return useQuery<WeatherState['areas'][0]>({
    queryKey: ['weather', 'area', areaId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/weather/areas/${areaId}`);
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};
