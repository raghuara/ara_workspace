import { PERMISSIONS } from '@/constants/permissions'
import { db } from './mockDb'
import { mockRequest, notFound } from './httpClient'
import { DEFAULT_PAGE_SIZE, byDateDescending, matchesSearch, paginate } from './queryUtils'

const findEmployee = (employeeId) => {
  const employee = db.employees.find((candidate) => candidate.id === employeeId)
  if (!employee) throw notFound('That employee record does not exist.')
  return employee
}

export const employeeService = {
  listEmployees: ({ search, department, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const filtered = db.employees.filter(
          (employee) =>
            matchesSearch(search, employee.fullName, employee.employeeId, employee.email, employee.designation) &&
            (!department || employee.department === department) &&
            (!status || employee.status === status),
        )

        return paginate(filtered, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),

  getEmployee: (employeeId) =>
    mockRequest(() => findEmployee(employeeId), {
      requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW],
    }),

  getEmployeeOptions: () =>
    mockRequest(
      () =>
        db.employees.map((employee) => ({
          id: employee.id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          department: employee.department,
          designation: employee.designation,
        })),
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),

  getDocuments: (employeeId) =>
    mockRequest(() => db.documents.filter((document) => document.employeeId === employeeId), {
      requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW],
    }),

  getDirectReports: (employeeId) =>
    mockRequest(
      () =>
        db.employees
          .filter((employee) => employee.reportingManagerId === employeeId)
          .map((employee) => ({
            id: employee.id,
            fullName: employee.fullName,
            designation: employee.designation,
            status: employee.status,
          })),
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),

  getRecruitmentHistory: (employeeId) =>
    mockRequest(
      () => db.interviews.filter((interview) => interview.interviewerId === employeeId).sort(byDateDescending('date')),
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ),

  updatePersonalInformation: (employeeId, personalInformation) =>
    mockRequest(
      () => {
        const employee = findEmployee(employeeId)
        employee.personalInformation = {
          ...employee.personalInformation,
          ...personalInformation,
          emergencyContact: {
            ...employee.personalInformation.emergencyContact,
            ...personalInformation.emergencyContact,
          },
        }
        return employee
      },
      { requiredPermissions: [PERMISSIONS.EMPLOYEE_UPDATE] },
    ),
}
