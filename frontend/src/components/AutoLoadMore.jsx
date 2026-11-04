import { useEffect, useRef } from 'react'
import { Button } from '@mui/material'

export const AutoLoadMore = ({ hidden, step, onMore, scrollRoot, color, fullWidth = false, sx }) => {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const container = scrollRoot ? node.closest(scrollRoot) : null
    const bounded = container && window.getComputedStyle(container).maxHeight !== 'none'
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onMore()
      },
      { root: bounded ? container : null, rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hidden, onMore, scrollRoot])

  return (
    <Button
      ref={ref}
      size="small"
      fullWidth={fullWidth}
      onClick={onMore}
      sx={{ color, fontWeight: 600, ...sx }}
    >
      Show {Math.min(hidden, step)} more · {hidden} not shown
    </Button>
  )
}
