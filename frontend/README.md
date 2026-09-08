# ARA Workspace — Frontend

Internal employee and operations platform. React + Vite + Material UI, written in plain JavaScript.

The backend is intentionally **not** built. Every screen runs against a mock API layer that mirrors
the shape of the REST endpoints you will implement in Node.js.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Modules

| Module           | Screens                                             | Permissions                                                          |
| ---------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Dashboard        | Headcount, upcoming interviews, pending reviews      | `employee.view`, `interview.view`, `review.view`                     |
| Employees        | Directory, employee details, personal information    | `employee.view`, `employee.update`                                    |
| Recruitment      | Interview schedule, interview reviews                | `interview.view`, `interview.update`, `review.view`                   |
| Performance      | Employee reviews                                     | `review.view`, `review.update`                                        |
| Compensation     | Salary overview, increment, salary history           | `compensation.view`, `compensation.update`, `compensation.history.view` |

## Compensation is a separate data domain

Salary never appears on the dashboard, the employee table, the employee profile, recruitment or
performance screens. This is enforced structurally, not by hiding fields in the UI:

- `Employee` (`src/types/employee.js`) has no salary field at all.
- Compensation lives in its own mock dataset, service and types, keyed only by employee id.
- `compensationService` never returns a full employee record — only a small summary.

If you keep that separation in the Node API (separate routes, separate controller, separate
authorisation check), the UI needs no changes.

## Structure

```
src/
  api/          Service layer — the only place that talks to the "backend"
  components/   Shared presentational components
  constants/    Permissions, routes, navigation, domain enums
  features/     Feature modules (auth, dashboard, employees, recruitment, performance, compensation)
  hooks/        useAsync, useSubmit, usePermissions, useSession, useDebouncedValue
  layouts/      AppLayout, Sidebar, Header
  mock/         Mock data only — delete this folder once the API is live
  pages/        Route-level pages that are not feature-specific
  routes/       Route table and permission guards
  theme/        MUI theme and design tokens
  types/        JSDoc typedefs describing the API contract
  utils/        Date and formatting helpers
```

UI components never call the API directly — they go through a service in `src/api/`.

## Replacing the mock API with your Node backend

**1. Swap the transport.** `src/api/httpClient.js` is the single seam. Replace `mockRequest` with a
real `fetch` wrapper that keeps the same `ApiError` shape:

```js
export const request = async (path, options = {}) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.message ?? response.statusText, body.code)
  }
  return response.status === 204 ? null : response.json()
}
```

`isForbidden(error)` must keep returning true for 403 — `QueryStateView` relies on it to render the
"Access restricted" state instead of a generic error.

**2. Point each service at a route.** The services already define your endpoint surface:

| Service call                                      | Suggested endpoint                                |
| ------------------------------------------------- | ------------------------------------------------- |
| `employeeService.listEmployees(query)`             | `GET /employees?search=&department=&status=&page=&pageSize=` |
| `employeeService.getEmployee(id)`                  | `GET /employees/:id`                              |
| `employeeService.updatePersonalInformation(id, b)` | `PATCH /employees/:id/personal-information`       |
| `recruitmentService.listInterviews(query)`         | `GET /interviews`                                 |
| `recruitmentService.createInterview(body)`         | `POST /interviews`                                |
| `performanceService.listReviews(query)`            | `GET /performance-reviews`                        |
| `compensationService.listCompensation(query)`      | `GET /compensation`                               |
| `compensationService.createIncrement(body)`        | `POST /compensation/increments`                   |
| `compensationService.listSalaryHistory(query)`     | `GET /compensation/salary-history`                |
| `sessionService.getSession()`                      | `GET /session`                                    |

List endpoints should return `{ items, total, page, pageSize }` — that is what the tables expect.

**3. Delete `src/mock/` and `src/api/mockDb.js`.** Nothing else imports them.

## Permissions

`sessionService.getSession()` returns `{ user, role, permissions }`. `usePermissions()` exposes
`can`, `canAny` and `canAll`, which drive navigation visibility, action buttons and route guards.

Permission checks in this app are **UI behaviour only**. The Node backend must authorise every
request independently — a user who edits the client can reach any screen, so the API is the real
boundary. The mock layer returns genuine 403s so those paths are already exercised.

The header profile menu switches between four role presets (HR Manager, HR Executive, Engineering
Manager, Employee) so you can see how each screen degrades. Remove that switcher once real
authentication is in place — it lives in `src/layouts/Header.jsx` and `src/mock/session.js`.

## Notes

- No secrets, tokens or credentials belong in this app. Use `VITE_API_URL` for the API base URL only.
- Icons are Lucide React outlined icons throughout.
- Theme tokens are in `src/theme/tokens.js`; the MUI theme is in `src/theme/theme.js`.
