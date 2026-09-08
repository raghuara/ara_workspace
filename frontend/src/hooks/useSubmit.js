import { useCallback, useState } from 'react'

export const useSubmit = (action) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [succeeded, setSucceeded] = useState(false)

  const submit = useCallback(
    async (...args) => {
      setSubmitting(true)
      setError(null)
      setSucceeded(false)
      try {
        const result = await action(...args)
        setSucceeded(true)
        return result
      } catch (caught) {
        setError(caught)
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [action],
  )

  const reset = useCallback(() => {
    setError(null)
    setSucceeded(false)
  }, [])

  return { submit, submitting, error, succeeded, reset }
}
