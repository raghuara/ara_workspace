export class ApiError extends Error {
  constructor(status, message, code, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    // Field-level messages from a 400 VALIDATION_ERROR: { fieldName: 'message' }
    this.details = details
  }
}

export const isUnauthorized = (error) => error instanceof ApiError && error.status === 401
export const isForbidden = (error) => error instanceof ApiError && error.status === 403
export const isNotFound = (error) => error instanceof ApiError && error.status === 404

export const notFound = (message = 'The requested record could not be found.') =>
  new ApiError(404, message, 'NOT_FOUND')

export const badRequest = (message) => new ApiError(400, message, 'BAD_REQUEST')

// ---------------------------------------------------------------------------
// Token storage. The backend issues a JWT at login; it lives in localStorage
// when "remember me" is ticked, otherwise in sessionStorage (cleared on tab
// close). Every real request sends it as a Bearer header.
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'ara.token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const storeToken = (token, remember) => {
  try {
    clearToken()
    if (remember) localStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage blocked — the session simply will not survive a refresh.
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Real HTTP transport against the Node.js API.
// ---------------------------------------------------------------------------
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '/api' : `${window.location.protocol}//${window.location.hostname}:5000/api`)
).replace(/\/$/, '')

const writeListeners = new Set()

export const onSuccessfulWrite = (listener) => {
  writeListeners.add(listener)
  return () => writeListeners.delete(listener)
}

export const toQueryString = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

/**
 * Calls the backend. Non-2xx responses become ApiError so callers can use
 * isUnauthorized / isForbidden / isNotFound exactly as they did with the mock.
 */
export const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, isPublic = false } = options
  const headers = { Accept: 'application/json' }

  // FormData (file uploads) sets its own multipart Content-Type with the
  // boundary; only plain objects are sent as JSON.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (!isPublic && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.', 'NETWORK')
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? 'Unexpected server error.',
      payload?.code ?? 'INTERNAL',
      payload?.errors ?? null,
    )
  }

  if (method !== 'GET') writeListeners.forEach((listener) => listener())

  // 204 No Content (e.g. a successful DELETE) has no body.
  return payload
}


/** Fetches a binary response (an .xlsx, a PDF) with the session token attached. */
export const apiDownload = async (path) => {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.', 'NETWORK')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(response.status, payload?.message ?? 'The file could not be downloaded.', payload?.code ?? 'INTERNAL', null)
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/.exec(disposition)
  return { blob: await response.blob(), filename: match?.[1] ?? null }
}

/** Hands a Blob to the browser as a download. */
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
