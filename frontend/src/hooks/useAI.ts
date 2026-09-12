import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  emotion?: 'happy' | 'neutral' | 'thinking' | 'excited' | 'confused';
  timestamp: Date;
}

/**
 * Represents the AI's context, including user preferences and emotional state.
 */
export interface AIContext {
  currentQuest?: string;
  recentAchievements: string[];
  userPreferences: Record<string, unknown>;
  emotionalState: string;
}

/**
 * useChat - Custom hook to send a message to the AI and receive a response.
 * Returns a mutation function to send a message and retrieve the response.
 * Usage: const { mutate } = useChat(); mutate('Hello, AI!');
 */
export const useChat = () => {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data } = await apiClient.post<ChatMessage>(API_ENDPOINTS.AI.CHAT, { message });
      return data;
    },
  });
};

/**
 * useFacialAnalysis - Custom hook to analyze a facial image and retrieve the results.
 * Returns a mutation function to send an image and retrieve the analysis.
 * Usage: const { mutate } = useFacialAnalysis(); mutate(imageData);
 */
export const useFacialAnalysis = () => {
  return useMutation({
    mutationFn: async (imageData: string) => {
      const { data } = await apiClient.post(API_ENDPOINTS.AI.FACIAL, { image: imageData });
      return data;
    },
  });
};

export const useAIContext = () => {
  return useQuery<AIContext>({
    queryKey: ['ai-context'],
    queryFn: async (): Promise<AIContext> => {
      const { data } = await apiClient.get(API_ENDPOINTS.AI.CONTEXT);
      return data as AIContext;
    },
  });
};
