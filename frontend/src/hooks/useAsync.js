import { useCallback, useEffect, useState } from 'react'

/**
 * Runs a service call and tracks loading/error/data.
 *
 * `fetcher` must be a stable reference (a service method, not an inline arrow)
 * and `args` are serialised for the dependency comparison, which lets callers
 * pass query objects inline without re-running on every render.
 *
 * Loading is derived by comparing the requested key against the settled key so
 * that no state is written synchronously inside the effect.
 */
export const useAsync = (fetcher, args = [], { enabled = true } = {}) => {
  const argsKey = JSON.stringify(args)
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState({ key: null, data: null, error: null })

  const requestKey = `${argsKey}#${reloadToken}`

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false
    const key = `${argsKey}#${reloadToken}`

    fetcher(...JSON.parse(argsKey))
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ key, data: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [fetcher, argsKey, reloadToken, enabled])

  const loading = enabled && state.key !== requestKey

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  const setData = useCallback((data) => setState((current) => ({ ...current, data })), [])

  return {
    data: state.data,
    error: loading ? null : state.error,
    loading,
    reload,
    setData,
  }
}
