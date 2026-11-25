import { QueryClient, useQuery, type UseQueryResult } from '@tanstack/react-query';

/**
 * Local queries: TanStack Query caches on-device reads; every write calls
 * dataChanged(), which invalidates the 'db' namespace (see app/_layout).
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false, networkMode: 'always' } },
});

export function useData<T>(key: readonly unknown[], fn: () => Promise<T>): UseQueryResult<T> {
  return useQuery({ queryKey: ['db', ...key], queryFn: fn });
}

export function invalidateAll() {
  return queryClient.invalidateQueries({ queryKey: ['db'] });
}
