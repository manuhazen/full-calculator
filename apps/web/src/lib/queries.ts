import { QueryClient, queryOptions } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  threads: ['threads'] as const,
  history: (id: string) => ['calculations', id] as const,
};
export const threadOptions = () =>
  queryOptions({ queryKey: keys.threads, queryFn: ({ signal }) => api.threads(signal) });
export const historyOptions = (id: string) =>
  queryOptions({
    queryKey: keys.history(id),
    queryFn: ({ signal }) => api.history(id, signal),
    enabled: Boolean(id),
  });
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 }, mutations: { retry: false } },
  });
