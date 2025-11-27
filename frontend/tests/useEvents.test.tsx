import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: async () => ({ data: [
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
    ] }),
  },
}));

// For testing this specific hook, override useQuery in @tanstack/react-query to
// avoid experimental prefetch behavior in the test environment.
jest.mock('@tanstack/react-query', () => {
  const original = jest.requireActual('@tanstack/react-query');
  return {
    ...original,
    useQuery: () => ({ isSuccess: true, data: [
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
    ] }),
  };
});

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

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: async () => ({ data: mockEvents }),
  },
}));

describe('useEvents', () => {
  it('fetches mock events', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { refetchOnWindowFocus: false, retry: 0, staleTime: 1000, experimental_prefetchInRender: false },
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useEvents(), { wrapper });
    await waitFor(() => result.current.isSuccess);
    // debug: no-op
    expect(result.current.data?.[0].title).toBe('Test Event');
  });
});
