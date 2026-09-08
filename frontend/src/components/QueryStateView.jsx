import { AccessRestricted } from './AccessRestricted'
import { ErrorState } from './ErrorState'
import { isForbidden } from '@/api/httpClient'

/**
 * Renders the shared error branches for a service call. A 403 always resolves to
 * the access restricted state so that a permission failure never looks like a bug.
 */
export const QueryStateView = ({ error, onRetry, children }) => {
  if (isForbidden(error)) return <AccessRestricted />
  if (error) return <ErrorState description={error.message} onRetry={onRetry} />
  return <>{children}</>
}
