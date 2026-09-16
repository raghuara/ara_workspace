import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useSession } from '@/hooks/useSession'

/**
 * Sends anonymous visitors to the login page and remembers where they were
 * headed, so a bookmarked deep link still lands in the right place after sign-in.
 */
export const RequireAuth = () => {
  const { isAuthenticated } = useSession()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }
  return <Outlet />
}
