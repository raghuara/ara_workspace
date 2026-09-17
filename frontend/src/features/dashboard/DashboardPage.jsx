import { Navigate } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { workspaceViewPath } from '@/constants/routes'
import { usePermissions } from '@/hooks/usePermissions'
import { MasterAdminDashboard } from './MasterAdminDashboard'
import { WorkspaceDashboard } from './WorkspaceDashboard'

export const DashboardPage = () => {
  const { can } = usePermissions()

  if (!can(PERMISSIONS.DASHBOARD_VIEW)) return <Navigate to={workspaceViewPath('board')} replace />
  if (can(PERMISSIONS.WORKSPACE_CREATE)) return <MasterAdminDashboard />
  return <WorkspaceDashboard />
}
