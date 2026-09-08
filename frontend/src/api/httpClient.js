import { getActiveRole } from './mockDb'

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const isForbidden = (error) => error instanceof ApiError && error.status === 403
export const isNotFound = (error) => error instanceof ApiError && error.status === 404

export const notFound = (message = 'The requested record could not be found.') =>
  new ApiError(404, message, 'NOT_FOUND')

export const badRequest = (message) => new ApiError(400, message, 'BAD_REQUEST')

const MIN_LATENCY_MS = 180
const MAX_LATENCY_MS = 460

const randomLatency = () => MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)))

/**
 * Stand-in for the HTTP transport. Every service call goes through here, so
 * replacing this single function with fetch against the Node.js API is the only
 * change required to move off mock data.
 *
 * The permission check mirrors what the backend must enforce for real. It exists
 * here only so the UI can be developed against genuine 403 responses; it is not
 * a security boundary.
 */
export const mockRequest = (handler, options = {}) => {
  const { requiredPermissions = [] } = options

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const granted = getActiveRole().permissions
      const missing = requiredPermissions.filter((permission) => !granted.includes(permission))

      if (missing.length > 0) {
        reject(new ApiError(403, 'You do not have permission to access this resource.', 'FORBIDDEN'))
        return
      }

      try {
        resolve(clone(handler()))
      } catch (error) {
        reject(error instanceof ApiError ? error : new ApiError(500, 'Unexpected server error.', 'INTERNAL'))
      }
    }, randomLatency())
  })
}
