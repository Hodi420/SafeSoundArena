import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '../src/hooks/useEvents';
import { apiClient } from '../src/client';

describe('useEvents', () => {
  it('fetches mock events', async () => {
    apiClient.get = jest.fn().mockResolvedValue({ data: [{ id: '1', title: 'Test Event', description: 'A fun test event', startTime: new Date(), endTime: new Date(), capacity: 100, participants: 10, type: 'conference', status: 'upcoming', rewards: [{ amount: 10, type: 'Pi' }], emoji: '🎪' }] });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe('Test Event');
  });
});
