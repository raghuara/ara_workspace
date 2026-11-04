import { Navigate } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { workspaceViewPath } from '@/constants/routes'
import { USER_TYPE } from '@/constants/userTypes'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { EmployeeDashboard } from './EmployeeDashboard'
import { MasterAdminDashboard } from './MasterAdminDashboard'
import { WorkspaceDashboard } from './WorkspaceDashboard'


export const DashboardPage = () => {
  const { can } = usePermissions()
  const { userType } = useSession()

  if (userType?.id === USER_TYPE.EMPLOYEE) return <EmployeeDashboard />
  if (!can(PERMISSIONS.DASHBOARD_VIEW)) return <Navigate to={workspaceViewPath('board')} replace />
  if (can(PERMISSIONS.WORKSPACE_CREATE)) return <MasterAdminDashboard />
  return <WorkspaceDashboard />
}
