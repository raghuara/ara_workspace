import { useEffect, useState, useSyncExternalStore } from 'react'
import { Box } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import { useIsFetching } from '@tanstack/react-query'
import { getPendingWrites, onPendingWrites } from '@/api/httpClient'
import { colors } from '@/theme/tokens'

const SHOW_AFTER_MS = 180
const HIDE_AFTER_MS = 220

const slide = keyframes`
  0% { transform: translateX(-100%) scaleX(0.35); }
  50% { transform: translateX(40%) scaleX(0.6); }
  100% { transform: translateX(200%) scaleX(0.35); }
`

const userFacing = (query) => query.state.data === undefined || query.state.isInvalidated

export const TopProgress = () => {
  const loading = useIsFetching({ predicate: userFacing })
  const saving = useSyncExternalStore(onPendingWrites, getPendingWrites)
  const busy = loading + saving > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(busy), busy ? SHOW_AFTER_MS : HIDE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [busy])

  return (
    <Box
      role="progressbar"
      aria-hidden={!visible}
      aria-label="Loading"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        zIndex: 5,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      <Box
        sx={{
          width: '50%',
          height: '100%',
          borderRadius: 999,
          background: `linear-gradient(90deg, transparent, ${colors.brand}, transparent)`,
          animation: visible ? `${slide} 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite` : 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', width: '100%', opacity: 0.6 },
        }}
      />
    </Box>
  )
}
