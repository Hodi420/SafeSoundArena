import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketplace } from '../src/hooks/useMarketplace';
import { apiClient } from '../src/client';

describe('useMarketplace', () => {
  it('should return loading initially and then data', async () => {
    apiClient.get = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Sword', description: 'A test sword', price: 100, emoji: '🗡️', seller: 'shop', quantity: 1, rarity: 'rare', type: 'weapon' }] });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMarketplace(), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Sword');
  });
});
