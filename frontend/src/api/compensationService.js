import { PERMISSIONS } from '@/constants/permissions'
import { db, getActiveRole } from './mockDb'
import { badRequest, mockRequest, notFound } from './httpClient'
import { DEFAULT_PAGE_SIZE, byDateDescending, matchesSearch, paginate } from './queryUtils'

const employeeSummary = (employeeId) => {
  const employee = db.employees.find((candidate) => candidate.id === employeeId)
  if (!employee) throw notFound('That employee record does not exist.')

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    department: employee.department,
    designation: employee.designation,
    joiningDate: employee.joiningDate,
    status: employee.status,
  }
}

const findCompensation = (employeeId) => {
  const record = db.compensation.find((candidate) => candidate.employeeId === employeeId)
  if (!record) throw notFound('No compensation record exists for that employee.')
  return record
}

export const compensationService = {
  listCompensation: ({ search, department, payGrade, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const rows = db.compensation
          .map((record) => ({ ...record, employee: employeeSummary(record.employeeId) }))
          .filter(
            (row) =>
              matchesSearch(search, row.employee.fullName, row.employee.employeeId, row.employee.designation) &&
              (!department || row.employee.department === department) &&
              (!payGrade || row.payGrade === payGrade),
          )
          .sort((a, b) => b.grossSalary - a.grossSalary)

        return paginate(rows, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.COMPENSATION_VIEW] },
    ),

  getCompensationSummary: () =>
    mockRequest(
      () => {
        const records = db.compensation
        const total = records.reduce((sum, record) => sum + record.grossSalary, 0)
        const currentYear = String(new Date().getFullYear())
        const incrementsThisYear = db.salaryHistory.filter((entry) =>
          entry.effectiveDate.startsWith(currentYear),
        )

        return {
          employeesOnPayroll: records.length,
          monthlyPayroll: total,
          averageGrossSalary: records.length ? Math.round(total / records.length) : 0,
          incrementsThisYear: incrementsThisYear.length,
          currency: 'LKR',
        }
      },
      { requiredPermissions: [PERMISSIONS.COMPENSATION_VIEW] },
    ),

  /**
   * Employee picker for the increment flow. It is served from the compensation
   * domain so the screen never needs the broader employee.view permission.
   */
  listPayrollEmployees: () =>
    mockRequest(
      () =>
        db.compensation
          .map((record) => employeeSummary(record.employeeId))
          .sort((a, b) => a.fullName.localeCompare(b.fullName)),
      { requiredPermissions: [PERMISSIONS.COMPENSATION_VIEW] },
    ),

  getEmployeeCompensation: (employeeId) =>
    mockRequest(
      () => ({ ...findCompensation(employeeId), employee: employeeSummary(employeeId) }),
      { requiredPermissions: [PERMISSIONS.COMPENSATION_VIEW] },
    ),

  listSalaryHistory: ({ employeeId, search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const rows = db.salaryHistory
          .filter((entry) => (!employeeId || entry.employeeId === employeeId))
          .map((entry) => ({ ...entry, employee: employeeSummary(entry.employeeId) }))
          .filter((entry) => matchesSearch(search, entry.employee.fullName, entry.employee.employeeId, entry.reason))
          .sort(byDateDescending('effectiveDate'))

        return paginate(rows, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.COMPENSATION_HISTORY_VIEW] },
    ),

  createIncrement: ({ employeeId, incrementAmount, effectiveDate, reason }) =>
    mockRequest(
      () => {
        if (!employeeId) throw badRequest('An employee must be selected.')
        if (!Number.isFinite(incrementAmount) || incrementAmount <= 0) {
          throw badRequest('The increment amount must be greater than zero.')
        }
        if (!effectiveDate) throw badRequest('An effective date is required.')
        if (!reason) throw badRequest('A reason is required.')

        const record = findCompensation(employeeId)
        const previousSalary = record.grossSalary
        const newSalary = previousSalary + incrementAmount

        record.basicSalary += incrementAmount
        record.grossSalary = newSalary
        record.effectiveDate = effectiveDate
        record.lastIncrementDate = effectiveDate

        const entry = {
          id: `${employeeId}-SH-${db.salaryHistory.filter((item) => item.employeeId === employeeId).length + 1}`,
          employeeId,
          previousSalary,
          incrementAmount,
          newSalary,
          effectiveDate,
          reason,
          approvedBy: getActiveRole().user.name,
        }

        db.salaryHistory.push(entry)
        return entry
      },
      { requiredPermissions: [PERMISSIONS.COMPENSATION_UPDATE] },
    ),
}
