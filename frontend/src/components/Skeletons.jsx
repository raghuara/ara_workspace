import { Box, Skeleton, Stack } from '@mui/material'
import { colors } from '@/theme/tokens'

const card = {
  bgcolor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 2.5,
  overflow: 'hidden',
}

const Header = ({ wide = false }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1.75, py: 1.25, borderBottom: `1px solid ${colors.border}` }}>
    <Skeleton variant="rounded" width={3} height={30} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width={wide ? 260 : 150} height={18} />
      <Skeleton variant="text" width={wide ? 380 : 210} height={14} />
    </Box>
  </Stack>
)

/** Same footprint as a StatCard, so tiles do not jump when data lands. */
export const StatTileSkeleton = () => (
  <Box sx={{ ...card, p: { xs: 1.5, md: 1.75 } }}>
    <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width={90} height={12} />
        <Skeleton variant="rounded" width={72} height={28} sx={{ my: 0.75 }} />
        <Skeleton variant="text" width={130} height={12} />
      </Box>
      <Skeleton variant="rounded" width={34} height={34} />
    </Stack>
  </Box>
)

/** A list-style section: header plus a few avatar rows. */
export const ListSectionSkeleton = ({ rows = 4, wide = false }) => (
  <Box sx={card}>
    <Header wide={wide} />
    <Stack sx={{ px: 2, py: 1 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Stack key={index} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.125 }}>
          <Skeleton variant="circular" width={30} height={30} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={`${55 + ((index * 17) % 30)}%`} height={14} />
            <Skeleton variant="text" width={`${35 + ((index * 11) % 25)}%`} height={12} />
          </Box>
          <Skeleton variant="rounded" width={48} height={18} />
        </Stack>
      ))}
    </Stack>
  </Box>
)

/** A column chart section: header plus bars of varying height. */
export const ChartSectionSkeleton = ({ bars = 6, height = 176 }) => (
  <Box sx={card}>
    <Header />
    <Box sx={{ px: 1.75, pt: 1.75, pb: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-around', height, borderBottom: `1px solid ${colors.border}` }}>
        {Array.from({ length: bars }, (_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            sx={{ flex: '1 1 0', maxWidth: 32, height: `${35 + ((index * 23) % 60)}%`, borderRadius: '6px 6px 2px 2px' }}
          />
        ))}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-around', mt: 1 }}>
        {Array.from({ length: bars }, (_, index) => (
          <Skeleton key={index} variant="text" sx={{ flex: '1 1 0', maxWidth: 48, height: 12 }} />
        ))}
      </Stack>
    </Box>
  </Box>
)

/** Donut chart section: ring plus legend rows. */
export const DonutSectionSkeleton = () => (
  <Box sx={card}>
    <Header />
    <Stack sx={{ alignItems: 'center', px: 2, py: 2.5 }} spacing={2}>
      <Skeleton variant="circular" width={148} height={148} />
      <Stack spacing={1} sx={{ width: '100%' }}>
        {[0, 1, 2, 3].map((index) => (
          <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Skeleton variant="rounded" width={10} height={10} />
            <Skeleton variant="text" sx={{ flex: 1, height: 12 }} />
            <Skeleton variant="text" width={32} height={12} />
          </Stack>
        ))}
      </Stack>
    </Stack>
  </Box>
)

/** Table section: header plus a few columns × rows. */
export const TableSectionSkeleton = ({ rows = 4, columns = 5 }) => (
  <Box sx={card}>
    <Header wide />
    <Box sx={{ px: 2, py: 1.5 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 1.25 }}>
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} variant="text" sx={{ flex: index === 0 ? 2 : 1, height: 12 }} />
        ))}
      </Stack>
      {Array.from({ length: rows }, (_, row) => (
        <Stack key={row} direction="row" spacing={2} sx={{ py: 1, borderTop: `1px solid ${colors.border}` }}>
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} variant="text" sx={{ flex: index === 0 ? 2 : 1, height: 14 }} />
          ))}
        </Stack>
      ))}
    </Box>
  </Box>
)

/** Whole-dashboard placeholder matching the real grid. */
export const DashboardSkeleton = ({ tiles = 4 }) => (
  <Stack spacing={1.5}>
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: `repeat(${tiles}, 1fr)` } }}>
      {Array.from({ length: tiles }, (_, index) => (
        <StatTileSkeleton key={index} />
      ))}
    </Box>
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: '1.6fr 1fr 1fr' } }}>
      <Box sx={{ gridColumn: { md: '1 / -1', lg: 'auto' } }}>
        <ChartSectionSkeleton />
      </Box>
      <DonutSectionSkeleton />
      <ListSectionSkeleton />
    </Box>
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.6fr' } }}>
      <ListSectionSkeleton rows={3} />
      <TableSectionSkeleton rows={4} />
    </Box>
  </Stack>
)
