import { usePermissions } from '@/hooks/usePermissions'

export const PermissionGate = ({ permission, permissions, mode = 'all', fallback = null, children }) => {
  const { can, canAll, canAny } = usePermissions()
  const required = permissions ?? (permission ? [permission] : [])

  if (required.length === 0) return <>{children}</>

  const allowed =
    required.length === 1 ? can(required[0]) : mode === 'any' ? canAny(required) : canAll(required)

  return allowed ? <>{children}</> : fallback
}
