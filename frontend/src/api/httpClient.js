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
// Token storage. The backend issues a JWT at login. Each tab keeps its own
// copy in sessionStorage, so a refresh never swaps the account a tab signed
// in with. "Remember me" also keeps a copy in localStorage, which only seeds
// tabs that have not signed in yet (a new tab, or the browser reopening).
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'ara.token'

const attempt = (action, fallback = null) => {
  try {
    return action()
  } catch {
    return fallback
  }
}

const readTabToken = () => attempt(() => sessionStorage.getItem(TOKEN_KEY))
const readRememberedToken = () => attempt(() => localStorage.getItem(TOKEN_KEY))

const accountOf = (token) =>
  attempt(() => {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).userId ?? null
  })

const sameAccount = (first, second) => {
  if (!first || !second) return false
  const account = accountOf(first)
  return account !== null && account === accountOf(second)
}

export const getToken = () => {
  const own = readTabToken()
  if (own) return own

  const remembered = readRememberedToken()
  if (remembered) attempt(() => sessionStorage.setItem(TOKEN_KEY, remembered))
  return remembered
}

export const storeToken = (token, remember) => {
  attempt(() => sessionStorage.setItem(TOKEN_KEY, token))
  if (remember) {
    attempt(() => localStorage.setItem(TOKEN_KEY, token))
  } else if (sameAccount(readRememberedToken(), token)) {
    attempt(() => localStorage.removeItem(TOKEN_KEY))
  }
}

/**
 * The backend hands back a fresh token while someone keeps working, so an
 * active session never lapses. The tab's copy is replaced, and the remembered
 * copy too when it belongs to the same account.
 */
const SESSION_HEADER = 'X-Session-Token'

const refreshToken = (token) => {
  if (!token || token === readTabToken()) return
  attempt(() => sessionStorage.setItem(TOKEN_KEY, token))
  if (sameAccount(readRememberedToken(), token)) attempt(() => localStorage.setItem(TOKEN_KEY, token))
}

export const clearToken = () => {
  const own = readTabToken()
  const remembered = readRememberedToken()
  attempt(() => sessionStorage.removeItem(TOKEN_KEY))
  if (remembered && (!own || sameAccount(remembered, own))) attempt(() => localStorage.removeItem(TOKEN_KEY))
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

let pendingWrites = 0
const pendingListeners = new Set()

const trackWrite = (delta) => {
  pendingWrites += delta
  pendingListeners.forEach((listener) => listener(pendingWrites))
}

export const getPendingWrites = () => pendingWrites

export const onPendingWrites = (listener) => {
  pendingListeners.add(listener)
  return () => pendingListeners.delete(listener)
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
 * isUnauthorized / isForbidden / isNotFound to branch on the failure.
 */
export const apiRequest = async (path, options = {}) => {
  if ((options.method ?? 'GET') === 'GET') return send(path, options)
  trackWrite(1)
  try {
    return await send(path, options)
  } finally {
    trackWrite(-1)
  }
}

const send = async (path, options = {}) => {
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

  if (!isPublic) refreshToken(response.headers.get(SESSION_HEADER))

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
export const apiDownload = async (path, { method = 'GET', body } = {}) => {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.', 'NETWORK')
  }

  refreshToken(response.headers.get(SESSION_HEADER))

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
