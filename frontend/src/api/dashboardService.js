import { PERMISSIONS } from '@/constants/permissions'
import { EMPLOYMENT_STATUS } from '@/constants/domain'
import { db } from './mockDb'
import { mockRequest } from './httpClient'
import { byDateDescending } from './queryUtils'

const daysSince = (isoDate) => {
  const then = new Date(`${isoDate}T00:00:00`).getTime()
  return Math.floor((Date.now() - then) / 86400000)
}

/**
 * The dashboard aggregates headcount, recruitment and review activity only.
 * Compensation is a separate restricted domain and is deliberately absent here.
 */
export const dashboardService = {
  getEmployeeStats: () =>
    mockRequest(
      () => {
        const employees = db.employees
        const active = employees.filter((employee) => employee.status !== EMPLOYMENT_STATUS.INACTIVE)
        const newJoiners = employees.filter((employee) => daysSince(employee.joiningDate) <= 90)

        const byDepartment = employees.reduce((acc, employee) => {
          acc[employee.department] = (acc[employee.department] ?? 0) + 1
          return acc
        }, {})

        return {
          totalEmployees: active.length,
          newEmployees: newJoiners.length,
          onProbation: employees.filter((employee) => employee.status === EMPLOYMENT_STATUS.PROBATION).length,
          onNotice: employees.filter((employee) => employee.status === EMPLOYMENT_STATUS.NOTICE_PERIOD).length,
          departmentBreakdown: Object.entries(byDepartment)
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count),
        }
      },
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),

  getRecentEmployeeActivity: (limit = 6) =>
    mockRequest(
      () =>
        db.employees
          .slice()
          .sort(byDateDescending('joiningDate'))
          .slice(0, limit)
          .map((employee) => ({
            id: employee.id,
            fullName: employee.fullName,
            designation: employee.designation,
            department: employee.department,
            joiningDate: employee.joiningDate,
            status: employee.status,
          })),
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),
}
