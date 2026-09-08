import { PERMISSIONS } from '@/constants/permissions'

/**
 * Role presets exist so the UI can be exercised against different permission
 * sets during frontend development. The real role-to-permission mapping must be
 * resolved by the Node.js backend and returned on the session endpoint.
 */
export const ROLE_DEFINITIONS = [
  {
    id: 'hr-manager',
    name: 'HR Manager',
    description: 'Full access including the restricted compensation module',
    user: {
      id: 'EMP-0021',
      name: 'Shanika Peiris',
      email: 'shanika.peiris@araworkspace.com',
      designation: 'HR Manager',
      department: 'Human Resources',
    },
    permissions: [
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.INTERVIEW_VIEW,
      PERMISSIONS.INTERVIEW_UPDATE,
      PERMISSIONS.REVIEW_VIEW,
      PERMISSIONS.REVIEW_UPDATE,
      PERMISSIONS.COMPENSATION_VIEW,
      PERMISSIONS.COMPENSATION_UPDATE,
      PERMISSIONS.COMPENSATION_HISTORY_VIEW,
    ],
  },
  {
    id: 'hr-executive',
    name: 'HR Executive',
    description: 'People operations without any compensation access',
    user: {
      id: 'EMP-0022',
      name: 'Roshan De Silva',
      email: 'roshan.desilva@araworkspace.com',
      designation: 'Senior HR Executive',
      department: 'Human Resources',
    },
    permissions: [
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.INTERVIEW_VIEW,
      PERMISSIONS.INTERVIEW_UPDATE,
      PERMISSIONS.REVIEW_VIEW,
    ],
  },
  {
    id: 'engineering-manager',
    name: 'Engineering Manager',
    description: 'Team visibility, interviews and performance reviews',
    user: {
      id: 'EMP-0001',
      name: 'Amara Perera',
      email: 'amara.perera@araworkspace.com',
      designation: 'Engineering Manager',
      department: 'Engineering',
    },
    permissions: [
      PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.INTERVIEW_VIEW,
      PERMISSIONS.INTERVIEW_UPDATE,
      PERMISSIONS.REVIEW_VIEW,
      PERMISSIONS.REVIEW_UPDATE,
    ],
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Directory access only',
    user: {
      id: 'EMP-0004',
      name: 'Kasun Rathnayake',
      email: 'kasun.rathnayake@araworkspace.com',
      designation: 'Software Engineer',
      department: 'Engineering',
    },
    permissions: [PERMISSIONS.EMPLOYEE_VIEW],
  },
]

export const DEFAULT_ROLE_ID = 'hr-manager'

export const findRole = (roleId) =>
  ROLE_DEFINITIONS.find((role) => role.id === roleId) ??
  ROLE_DEFINITIONS.find((role) => role.id === DEFAULT_ROLE_ID)
