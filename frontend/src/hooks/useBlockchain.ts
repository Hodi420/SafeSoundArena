import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export interface Transaction {
  id: string;
  type: 'reward' | 'transfer' | 'stake';
  amount: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  from: string;
  to: string;
  emoji: '🎁' | '💸' | '🔒'; // Transaction type emoji
}

export interface Balance {
  available: number;
  staked: number;
  pending: number;
}

export const useBalance = () => {
  return useQuery<Balance>({
    queryKey: ['balance'],
    queryFn: async (): Promise<Balance> => {
      const { data } = await apiClient.get(API_ENDPOINTS.BLOCKCHAIN.BALANCE);
      return data as Balance;
    },
  });
};

export const useTransactions = () => {
  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      const { data } = await apiClient.get(API_ENDPOINTS.BLOCKCHAIN.TRANSACTIONS);
      return data as Transaction[];
    },
  });
};

export const useTransfer = () => {
  return useMutation({
    mutationFn: async ({ to, amount }: { to: string; amount: number }) => {
      const { data } = await apiClient.post(API_ENDPOINTS.BLOCKCHAIN.TRANSFER, { to, amount });
      return data;
    },
  });
};
