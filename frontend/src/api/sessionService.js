import { ROLE_DEFINITIONS } from '@/mock/session'
import { getActiveRole, setActiveRole } from './mockDb'
import { mockRequest } from './httpClient'

const toSession = (role) => ({
  user: role.user,
  role: { id: role.id, name: role.name, description: role.description },
  permissions: role.permissions,
})

export const sessionService = {
  getSession: () => mockRequest(() => toSession(getActiveRole())),

  listRoles: () =>
    mockRequest(() =>
      ROLE_DEFINITIONS.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    ),

  switchRole: (roleId) => mockRequest(() => toSession(setActiveRole(roleId))),
}
