import { apiDownload, apiRequest, toQueryString } from './httpClient'
import { DEFAULT_PAGE_SIZE } from './queryUtils'

export const employeeService = {
  listEmployees: ({ workspaceId, search, department, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    apiRequest(`/employees${toQueryString({ workspaceId, search, department, status, page, pageSize })}`),

  getEmployee: (employeeId) => apiRequest(`/employees/${encodeURIComponent(employeeId)}`),

  getEmployeeOptions: async (workspaceId) => {
    const { items } = await apiRequest(`/employees${toQueryString({ workspaceId, pageSize: 100 })}`)
    return items.map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      workspaceName: employee.workspaceName,
      loginUserTypeId: employee.loginUserTypeId ?? null,
    }))
  },

  createEmployee: (payload) => apiRequest('/employees', { method: 'POST', body: payload }),

  updateEmployee: (employeeId, payload) =>
    apiRequest(`/employees/${encodeURIComponent(employeeId)}`, { method: 'PUT', body: payload }),

  getDirectReports: (employeeId) => apiRequest(`/employees/${encodeURIComponent(employeeId)}/direct-reports`),

  downloadImportTemplate: (workspaceId) => apiDownload(`/employees/import/template${toQueryString({ workspaceId })}`),

  previewImport: (file, { workspaceId }) => {
    const form = new FormData()
    form.append('workspaceId', workspaceId)
    form.append('file', file)
    return apiRequest('/employees/import/preview', { method: 'POST', body: form })
  },

  runImport: (file, { workspaceId, createLogins = true }) => {
    const form = new FormData()
    form.append('workspaceId', workspaceId)
    form.append('file', file)
    form.append('createLogins', String(createLogins))
    return apiRequest('/employees/import', { method: 'POST', body: form })
  },
}
