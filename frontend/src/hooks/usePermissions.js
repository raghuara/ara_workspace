import { useMemo } from 'react'
import { useSession } from './useSession'

/**
 * Frontend permission checks drive UI affordances only. Authorisation is the
 * backend's responsibility; every guarded screen must still handle a 403.
 */
export const usePermissions = () => {
  const { permissions } = useSession()

  return useMemo(() => {
    const granted = new Set(permissions)
    return {
      permissions,
      can: (permission) => granted.has(permission),
      canAny: (required = []) => required.some((permission) => granted.has(permission)),
      canAll: (required = []) => required.every((permission) => granted.has(permission)),
    }
  }, [permissions])
}
