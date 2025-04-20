import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '../src/hooks/useEvents';

describe('useEvents', () => {
  it('fetches mock events', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, waitFor } = renderHook(() => useEvents(), { wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data?.[0].title).toBe('Test Event');
  });
});
