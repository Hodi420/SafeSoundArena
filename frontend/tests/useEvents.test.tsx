import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '../src/hooks/useEvents';

const mockEvents = [
  {
    id: '1',
    title: 'Test Event',
    description: 'A fun test event',
    startTime: new Date(),
    endTime: new Date(),
    capacity: 100,
    participants: 10,
    type: 'conference',
    status: 'upcoming',
    rewards: [{ amount: 10, type: 'Pi' }],
    emoji: '🎪',
  },
];

describe('useEvents', () => {
  it('fetches mock events', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockEvents,
    }) as jest.Mock;
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, experimental_prefetchInRender: false },
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe('Test Event');
  });
});
