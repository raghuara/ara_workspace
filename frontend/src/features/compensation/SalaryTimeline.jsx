import { Box, Stack, Typography } from '@mui/material'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/format'

export const SalaryTimeline = ({ entries }) => (
  <Stack component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
    {entries.map((entry, index) => {
      const percentChange =
        entry.previousSalary > 0 ? (entry.incrementAmount / entry.previousSalary) * 100 : 0
      const isLast = index === entries.length - 1

      return (
        <Box component="li" key={entry.id} sx={{ display: 'flex', gap: 2 }}>
          <Stack alignItems="center" sx={{ flexShrink: 0 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                mt: 0.75,
                bgcolor: colors.surface,
                border: `2px solid ${index === 0 ? colors.brand : colors.border}`,
              }}
            />
            {isLast ? null : <Box aria-hidden="true" sx={{ width: '2px', flex: 1, bgcolor: colors.border }} />}
          </Stack>

          <Box sx={{ pb: isLast ? 0 : 3, minWidth: 0, flex: 1 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={0.5}
              sx={{ mb: 0.75 }}
            >
              <Typography variant="body2" fontWeight={600}>
                {entry.reason}
              </Typography>
              <Typography variant="caption">Effective {formatDate(entry.effectiveDate)}</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(entry.previousSalary)}
              </Typography>
              <Typography variant="body2" color="text.secondary" aria-hidden="true">
                →
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(entry.newSalary)}
              </Typography>
              <Box
                sx={{
                  px: 0.875,
                  py: 0.125,
                  borderRadius: 1,
                  bgcolor: colors.successSoft,
                  color: colors.success,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                +{formatCurrency(entry.incrementAmount)} · {formatPercent(percentChange)}
              </Box>
            </Stack>

            <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
              Approved by {entry.approvedBy}
            </Typography>
          </Box>
        </Box>
      )
    })}
  </Stack>
)
