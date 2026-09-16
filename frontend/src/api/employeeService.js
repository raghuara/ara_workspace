import { apiRequest, toQueryString } from './httpClient'
import { DEFAULT_PAGE_SIZE } from './queryUtils'

export const employeeService = {
  listEmployees: ({ search, department, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    apiRequest(`/employees${toQueryString({ search, department, status, page, pageSize })}`),

  getEmployee: (employeeId) => apiRequest(`/employees/${encodeURIComponent(employeeId)}`),

  getEmployeeOptions: async () => {
    const { items } = await apiRequest(`/employees${toQueryString({ pageSize: 100 })}`)
    return items.map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
    }))
  },

  createEmployee: (payload) => apiRequest('/employees', { method: 'POST', body: payload }),

  updateEmployee: (employeeId, payload) =>
    apiRequest(`/employees/${encodeURIComponent(employeeId)}`, { method: 'PUT', body: payload }),

  getDirectReports: (employeeId) => apiRequest(`/employees/${encodeURIComponent(employeeId)}/direct-reports`),
}
