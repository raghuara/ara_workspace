import { useState } from 'react'
import { Box, Button, Checkbox, Popover, Stack, Tooltip, Typography } from '@mui/material'
import { Columns3, Lock } from 'lucide-react'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { DEFAULT_METRICS, METRICS, SECTIONS, isAvailable, overline } from './trackerModel'

export const TrackerColumnPicker = ({ selected, onChange, capabilities }) => {
  const [anchor, setAnchor] = useState(null)
  const available = METRICS.filter((metric) => isAvailable(metric, capabilities))
  const shown = available.filter((metric) => selected.includes(metric.key))
  const isDefault =
    DEFAULT_METRICS.length === selected.length && DEFAULT_METRICS.every((key) => selected.includes(key))

  const toggle = (key) => {
    if (selected.includes(key)) {
      if (shown.length <= 1) return
      onChange(selected.filter((item) => item !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<Columns3 size={14} strokeWidth={2} />}
        aria-haspopup="dialog"
      >
        Columns
        <Box
          component="span"
          sx={{ ml: 0.75, px: 0.625, borderRadius: 999, bgcolor: colors.brandSoft, color: colors.brand, fontSize: '0.6875rem', fontWeight: 700 }}
        >
          {shown.length}
        </Box>
      </Button>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 24px)', borderRadius: 2.5, overflow: 'hidden' } } }}
      >
        <Box sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${colors.border}` }}>
          <Typography variant="h4" component="h3">
            Show columns
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: colors.textSecondary }}>
            Pick what to count for each person. Your choice is remembered on this device.
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 420, overflowY: 'auto', py: 0.5 }}>
          {Object.entries(SECTIONS).map(([sectionKey, section]) => (
            <Box key={sectionKey} sx={{ py: 0.5 }}>
              <Typography sx={{ ...overline, px: 1.75, py: 0.5, color: STATUS_TONES[section.tone].strong }}>{section.label}</Typography>
              {METRICS.filter((metric) => metric.section === sectionKey).map((metric) => {
                const usable = isAvailable(metric, capabilities)
                const checked = usable && selected.includes(metric.key)
                const lastOne = checked && shown.length <= 1
                const row = (
                  <Box
                    component="label"
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      mx: 0.75,
                      borderRadius: 1.5,
                      cursor: usable && !lastOne ? 'pointer' : 'default',
                      opacity: usable ? 1 : 0.55,
                      '&:hover': { bgcolor: usable ? colors.page : 'transparent' },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={!usable || lastOne}
                      onChange={() => toggle(metric.key)}
                      sx={{ p: 0.5, mt: '1px' }}
                    />
                    <Box sx={{ minWidth: 0, py: 0.5 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {metric.label}
                        </Typography>
                        {!usable ? <Lock size={12} strokeWidth={2} aria-label="Needs Client Desk access" /> : null}
                      </Stack>
                      <Typography variant="caption" component="p" sx={{ color: colors.textSecondary, lineHeight: 1.4 }}>
                        {usable ? metric.help : 'Needs Client Desk access.'}
                      </Typography>
                    </Box>
                  </Box>
                )
                return lastOne ? (
                  <Tooltip key={metric.key} title="Keep at least one column" placement="left">
                    {row}
                  </Tooltip>
                ) : (
                  <Box key={metric.key}>{row}</Box>
                )
              })}
            </Box>
          ))}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ px: 1.75, py: 1.25, borderTop: `1px solid ${colors.border}`, bgcolor: colors.page, alignItems: 'center' }}
        >
          <Button size="small" disabled={isDefault} onClick={() => onChange(DEFAULT_METRICS)}>
            Reset to default
          </Button>
          <Button
            size="small"
            disabled={shown.length === available.length}
            onClick={() => onChange(available.map((metric) => metric.key))}
          >
            Select all
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" onClick={() => setAnchor(null)}>
            Done
          </Button>
        </Stack>
      </Popover>
    </>
  )
}
