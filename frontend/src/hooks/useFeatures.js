import { useMemo } from 'react'
import { useSession } from './useSession'

export const useFeatures = () => {
  const { features } = useSession()

  return useMemo(
    () => ({
      features,
      isEnabled: (featureKey) => features[featureKey] !== false,
      anyEnabled: (keys = []) => keys.some((key) => features[key] !== false),
    }),
    [features],
  )
}
