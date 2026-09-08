import { Box } from '@mui/material'
import { AccessRestricted } from '@/components/AccessRestricted'
import { PageHeader } from '@/components/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Hides a route the current session cannot use. This is a UI convenience only —
 * the backend must reject the underlying requests independently.
 */
export const RequirePermission = ({ permission, title = 'Access restricted', breadcrumbs, children }) => {
  const { can } = usePermissions()

  if (can(permission)) return <>{children}</>

  return (
    <Box>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <AccessRestricted />
    </Box>
  )
}
