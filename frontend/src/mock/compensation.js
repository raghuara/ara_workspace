import { INCREMENT_REASONS } from '@/constants/domain'
import { daysFromNow } from '@/utils/date'

/**
 * Compensation mock data is intentionally keyed only by employee id. It is never
 * merged into the employee dataset so that no employee, dashboard, recruitment or
 * performance screen can read a salary value even by accident.
 */
const PAY_BANDS = [
  { match: /Head of|Manager|Lead/, grade: 'M3', basic: 420000, allowances: 95000 },
  { match: /Senior/, grade: 'L4', basic: 285000, allowances: 62000 },
  { match: /Engineer|Executive|Designer|Analyst|Accountant|Officer|Specialist/, grade: 'L3', basic: 195000, allowances: 44000 },
  { match: /Associate|Coordinator/, grade: 'L2', basic: 138000, allowances: 30000 },
  { match: /Intern/, grade: 'L1', basic: 65000, allowances: 12000 },
]

const resolveBand = (designation) =>
  PAY_BANDS.find((band) => band.match.test(designation)) ?? PAY_BANDS[2]

export const buildMockCompensation = (employees) =>
  employees.map((employee, index) => {
    const band = resolveBand(employee.designation)
    const variance = ((index * 4700) % 38000) - 12000
    const basicSalary = Math.round((band.basic + variance) / 500) * 500
    const allowances = band.allowances

    return {
      employeeId: employee.id,
      basicSalary,
      allowances,
      grossSalary: basicSalary + allowances,
      currency: 'LKR',
      payGrade: band.grade,
      effectiveDate: daysFromNow(-(30 + (index % 300))),
      lastIncrementDate: index % 7 === 0 ? null : daysFromNow(-(60 + (index % 400))),
    }
  })

export const buildMockSalaryHistory = (compensationRecords, employees) => {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))

  return compensationRecords.flatMap((record, index) => {
    const employee = employeeById.get(record.employeeId)
    if (!employee) return []

    const joinYear = Number(employee.joiningDate.slice(0, 4))
    const entryCount = Math.min(3, Math.max(1, new Date().getFullYear() - joinYear))

    let currentSalary = record.grossSalary
    const entries = []

    for (let step = 0; step < entryCount; step += 1) {
      const incrementAmount = Math.round((currentSalary * (0.06 + ((index + step) % 7) / 100)) / 500) * 500
      const previousSalary = currentSalary - incrementAmount

      entries.push({
        id: `${record.employeeId}-SH-${entryCount - step}`,
        employeeId: record.employeeId,
        previousSalary,
        incrementAmount,
        newSalary: currentSalary,
        effectiveDate: daysFromNow(-(120 + step * 365 + (index % 60))),
        reason: INCREMENT_REASONS[(index + step) % INCREMENT_REASONS.length],
        approvedBy: 'Shanika Peiris',
      })

      currentSalary = previousSalary
    }

    return entries
  })
}
