import { useCallback } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'

const fetcherIds = new WeakMap()
let nextFetcherId = 0

const fetcherKey = (fetcher) => {
  if (!fetcherIds.has(fetcher)) {
    nextFetcherId += 1
    fetcherIds.set(fetcher, `${fetcher.name || 'request'}#${nextFetcherId}`)
  }
  return fetcherIds.get(fetcher)
}

export const useAsync = (fetcher, args = [], { enabled = true, initialData, keepPrevious = true } = {}) => {
  const queryClient = useQueryClient()
  const queryKey = [fetcherKey(fetcher), ...args]
  const seeded = initialData !== undefined && initialData !== null

  const query = useQuery({
    queryKey,
    queryFn: () => fetcher(...args),
    enabled,
    ...(seeded ? { initialData, initialDataUpdatedAt: 0 } : {}),
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  })

  const keyHash = JSON.stringify(queryKey)
  const { refetch } = query

  const reload = useCallback(() => refetch(), [refetch])

  const setData = useCallback(
    (data) => queryClient.setQueryData(JSON.parse(keyHash), data),
    [queryClient, keyHash],
  )

  return {
    data: query.data ?? null,
    error: query.isError ? query.error : null,
    loading: enabled && (query.isPending || (query.isFetching && query.isPlaceholderData)),
    reload,
    setData,
  }
}
