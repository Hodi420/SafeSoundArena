import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketplace } from '../src/hooks/useMarketplace';

describe('useMarketplace', () => {
  it('should return loading initially', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMarketplace(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  // You can add more tests for error and data states with mock API
});
