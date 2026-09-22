import { QueryClient } from '@tanstack/react-query'
import { isForbidden, isNotFound, isUnauthorized, onSuccessfulWrite } from './httpClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) =>
        !isUnauthorized(error) && !isForbidden(error) && !isNotFound(error) && failureCount < 1,
    },
  },
})

onSuccessfulWrite(() => queryClient.invalidateQueries({ refetchType: 'none' }))
