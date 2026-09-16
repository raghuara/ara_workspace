import { Navigate } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { workspaceViewPath } from '@/constants/routes'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { MasterAdminDashboard } from './MasterAdminDashboard'
import { WorkspaceDashboard } from './WorkspaceDashboard'

/**
 * The landing page depends on who signed in. The three system user types are
 * matched by id; custom types fall back to what they are allowed to see, so a
 * new role never lands on a page it cannot use.
 *
 *  - Master Admin (1)  → every workspace, side by side
 *  - Admin (2) and anyone who can see all tasks → their own workspace
 *  - Employee (3) and anyone limited to their own tasks → straight to the board
 */
export const DashboardPage = () => {
  const { userType } = useSession()
  const { can } = usePermissions()

  const typeId = userType?.id
  const isMaster = typeId === 1 || can(PERMISSIONS.WORKSPACE_CREATE)
  const isEmployee = typeId === 3 || (!isMaster && !can(PERMISSIONS.TASK_VIEW_ALL))

  if (isEmployee) return <Navigate to={workspaceViewPath('board')} replace />
  if (isMaster) return <MasterAdminDashboard />
  return <WorkspaceDashboard />
}
