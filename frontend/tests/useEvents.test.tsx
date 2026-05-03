import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '../src/hooks/useEvents';

describe('useEvents', () => {
  it('fetches mock events', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: '1',
          title: 'Test Event',
          description: 'A fun test event',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          capacity: 100,
          participants: 10,
          type: 'conference',
          status: 'upcoming',
          rewards: [{ amount: 10, type: 'Pi' }],
          emoji: '🎪',
        },
      ]),
    }) as jest.Mock;
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe('Test Event');
  });
});
