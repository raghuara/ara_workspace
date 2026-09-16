import { useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { colors } from '@/theme/tokens'

/**
 * Colours used only inside charts. They map the app's tone names onto fills
 * that read well as bars and ring segments: brighter than the chip palette, and
 * the two neutral tones become sky and indigo so a chart never shows grey.
 */
const CHART_COLORS = {
  blue: '#2563EB',
  violet: '#7C3AED',
  teal: '#0D9488',
  amber: '#F59E0B',
  rose: '#F43F5E',
  green: '#22C55E',
  orange: '#F97316',
  pink: '#EC4899',
  slate: '#0EA5E9',
  gray: '#6366F1',
}

const fillFor = (tone) => CHART_COLORS[tone] ?? CHART_COLORS.blue
// 8-digit hex: a ~9% wash of the fill, used for the hover band behind a bar.
const washFor = (tone) => `${fillFor(tone)}17`

const niceScale = (max, tickCount = 4) => {
  if (max <= 0) return { max: tickCount, ticks: Array.from({ length: tickCount + 1 }, (_, i) => i) }
  const rough = max / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  return { max: top, ticks }
}

const Tooltip = ({ title, rows, align }) => (
  <Box
    role="tooltip"
    sx={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      ...(align === 'start' ? { left: 0 } : align === 'end' ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
      zIndex: 2,
      minWidth: 132,
      bgcolor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 2,
      boxShadow: '0 8px 20px rgba(15,23,42,0.10)',
      px: 1.5,
      py: 1,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}
  >
    <Typography variant="body2" fontWeight={650} sx={{ mb: 0.5 }}>
      {title}
    </Typography>
    {rows.map((row) => (
      <Stack key={row.label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: row.color, flexShrink: 0 }} />
        <Typography variant="caption">{row.label}:</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.value}
        </Typography>
      </Stack>
    ))}
  </Box>
)

/**
 * Column chart. Bars are slim and capped in width, so two bars look like two
 * bars rather than two slabs; each column has a hover band and a tooltip card.
 *
 * data: [{ label, value, tone? }]
 * seriesLabel: the name shown beside the value in the hover card.
 * monochrome: paint every bar in the brand blue (the reference look); set false
 *             when the tones carry meaning, e.g. board-status colours.
 */
export const ColumnChart = ({
  data,
  height = 176,
  valueLabel = (v) => v,
  seriesLabel = 'Tasks',
  ariaLabel,
  showAverage = true,
  monochrome = true,
  maxBarWidth = 40,
}) => {
  const [active, setActive] = useState(null)
  const values = data.map((d) => d.value)
  const { max, ticks } = niceScale(Math.max(0, ...values))
  const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
  const pct = (v) => (max ? (v / max) * 100 : 0)
  const toneOf = (item) => (monochrome ? 'blue' : (item.tone ?? 'blue'))

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.25 }} role="img" aria-label={ariaLabel}>
      <Stack sx={{ justifyContent: 'space-between', height, textAlign: 'right', pt: '1px' }}>
        {[...ticks].reverse().map((tick) => (
          <Typography key={tick} variant="caption" sx={{ lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {valueLabel(tick)}
          </Typography>
        ))}
      </Stack>

      <Box>
        <Box sx={{ position: 'relative', height }} onMouseLeave={() => setActive(null)}>
          {ticks.map((tick) => (
            <Box
              key={tick}
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${pct(tick)}%`,
                borderTop: `1px ${tick === 0 ? 'solid' : 'dashed'} ${colors.border}`,
              }}
            />
          ))}

          {showAverage && data.length > 1 ? (
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${pct(average)}%`,
                borderTop: `1.5px dashed ${colors.brandDark}`,
                opacity: 0.7,
                zIndex: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ position: 'absolute', right: 0, top: 3, bgcolor: colors.brandSoft, color: colors.brandDark, fontWeight: 650, px: 0.625, borderRadius: 1, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}
              >
                {valueLabel(Number(average.toFixed(1)))}
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-around' }}>
            {data.map((item, index) => {
              const tone = toneOf(item)
              const isActive = active === index
              const align = index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'center'
              return (
                <Box
                  key={item.label}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${item.label}: ${valueLabel(item.value)}`}
                  sx={{
                    position: 'relative',
                    flex: '1 1 0',
                    maxWidth: 96,
                    minWidth: 0,
                    bgcolor: isActive ? washFor(tone) : 'transparent',
                    borderRadius: 1.5,
                    transition: 'background-color 120ms ease',
                    outline: 'none',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: `min(${maxBarWidth}px, 58%)`,
                      height: `${pct(item.value)}%`,
                      minHeight: item.value > 0 ? 3 : 0,
                      borderRadius: '6px 6px 2px 2px',
                      bgcolor: fillFor(tone),
                      opacity: active === null || isActive ? 1 : 0.55,
                      transition: 'height 240ms ease, opacity 120ms ease',
                    }}
                  />
                  {isActive ? (
                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: `${pct(item.value)}%` }}>
                      <Tooltip title={item.label} align={align} rows={[{ label: seriesLabel, value: valueLabel(item.value), color: fillFor(tone) }]} />
                    </Box>
                  ) : null}
                </Box>
              )
            })}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 0.75 }}>
          {data.map((item, index) => (
            <Typography
              key={item.label}
              variant="caption"
              noWrap
              title={item.label}
              sx={{
                flex: '1 1 0',
                maxWidth: 96,
                minWidth: 0,
                textAlign: 'center',
                fontWeight: active === index ? 650 : 400,
                color: active === index ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {item.label}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Donut: a thick ring with the total in the middle and a legend that puts the
 * share in bold on the right, the way the reference lays out "Fee Split".
 *
 * data: [{ label, value, tone }]
 */
export const DonutChart = ({ data, size = 156, thickness = 22, centerLabel, centerValue, ariaLabel, valueLabel = (v) => v }) => {
  const [active, setActive] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 50 - thickness / 2 - 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row', lg: 'column', xxl: 'row' }}
      spacing={{ xs: 2, sm: 3, lg: 2, xxl: 3 }}
      sx={{ alignItems: 'center' }}
      role="img"
      aria-label={ariaLabel}
    >
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }} onMouseLeave={() => setActive(null)}>
        <Box
          component="svg"
          viewBox="0 0 100 100"
          sx={{ width: '100%', height: '100%', display: 'block', overflow: 'visible', transform: 'rotate(-90deg)' }}
        >
          <circle cx="50" cy="50" r={r} fill="none" stroke={colors.neutralSoft} strokeWidth={thickness} />
          {total > 0
            ? data.map((item, index) => {
                const length = (item.value / total) * circumference
                const segment = (
                  <circle
                    key={item.label}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={fillFor(item.tone)}
                    strokeWidth={active === index ? thickness + 3 : thickness}
                    strokeDasharray={`${Math.max(length - 1.5, 0)} ${circumference}`}
                    strokeDashoffset={-offset}
                    opacity={active === null || active === index ? 1 : 0.45}
                    onMouseEnter={() => setActive(index)}
                    style={{ transition: 'stroke-width 120ms ease, opacity 120ms ease', cursor: 'default' }}
                  >
                    <title>{`${item.label}: ${valueLabel(item.value)}`}</title>
                  </circle>
                )
                offset += length
                return segment
              })
            : null}
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <Box>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {active !== null ? valueLabel(data[active].value) : (centerValue ?? total)}
            </Typography>
            <Typography variant="caption" component="p" noWrap sx={{ maxWidth: size * 0.5 }}>
              {active !== null ? data[active].label : centerLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={0.75} sx={{ width: '100%', minWidth: 0, flex: 1 }}>
        {data.map((item, index) => {
          const share = total ? Math.round((item.value / total) * 100) : 0
          return (
            <Stack
              key={item.label}
              direction="row"
              spacing={1}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              sx={{
                alignItems: 'center',
                px: 0.75,
                py: 0.375,
                mx: -0.75,
                borderRadius: 1.5,
                bgcolor: active === index ? colors.neutralSoft : 'transparent',
                opacity: active === null || active === index ? 1 : 0.55,
                transition: 'opacity 120ms ease, background-color 120ms ease',
              }}
            >
              <Box aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: fillFor(item.tone), flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ width: 32, textAlign: 'right', color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {valueLabel(item.value)}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {share}%
              </Typography>
            </Stack>
          )
        })}
      </Stack>
    </Stack>
  )
}

/**
 * Ranked horizontal bars. `secondary` draws a thin second bar beneath in rose —
 * used for "assigned vs corrections" so both share one scale.
 *
 * rows: [{ label, sublabel?, value, tone, secondary? }]
 */
export const HorizontalBars = ({ rows, valueLabel = (v) => v, secondaryLabel, ariaLabel }) => {
  const max = Math.max(1, ...rows.flatMap((row) => [row.value, row.secondary ?? 0]))

  return (
    <Stack spacing={1.25} role="img" aria-label={ariaLabel}>
      {rows.map((row) => (
        <Box key={row.label}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {row.label}
              </Typography>
              {row.sublabel ? (
                <Typography variant="caption" component="p" noWrap>
                  {row.sublabel}
                </Typography>
              ) : null}
            </Box>
            <Typography variant="body2" fontWeight={650} sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {valueLabel(row.value)}
              {row.secondary !== undefined ? (
                <Typography component="span" variant="caption" sx={{ ml: 0.75 }}>
                  {secondaryLabel ? `${secondaryLabel} ${row.secondary}` : row.secondary}
                </Typography>
              ) : null}
            </Typography>
          </Stack>
          <Box sx={{ position: 'relative', height: row.secondary !== undefined ? 10 : 7 }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: 999, bgcolor: colors.neutralSoft }} />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: row.secondary !== undefined ? 6 : 7,
                width: `${(row.value / max) * 100}%`,
                borderRadius: 999,
                bgcolor: fillFor(row.tone),
                transition: 'width 240ms ease',
              }}
            />
            {row.secondary !== undefined ? (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${(row.secondary / max) * 100}%`,
                  borderRadius: 999,
                  bgcolor: CHART_COLORS.rose,
                  transition: 'width 240ms ease',
                }}
              />
            ) : null}
          </Box>
        </Box>
      ))}
    </Stack>
  )
}

/**
 * Label · progress bar · percentage per row. Colour follows the value.
 *
 * rows: [{ label, percent, hint? }]
 */
export const ProgressRows = ({ rows, ariaLabel, thresholds = { good: 75, warn: 50 } }) => (
  <Stack spacing={1.25} role="img" aria-label={ariaLabel}>
    {rows.map((row) => {
      const tone = row.percent >= thresholds.good ? 'green' : row.percent >= thresholds.warn ? 'amber' : 'rose'
      return (
        <Stack key={row.label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: { xs: 92, sm: 112 }, flexShrink: 0, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {row.label}
            </Typography>
            {row.hint ? (
              <Typography variant="caption" component="p" noWrap>
                {row.hint}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ flex: 1, height: 7, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${Math.min(100, Math.max(0, row.percent))}%`,
                height: '100%',
                borderRadius: 999,
                bgcolor: fillFor(tone),
                transition: 'width 240ms ease',
              }}
            />
          </Box>
          <Typography variant="body2" fontWeight={700} sx={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {row.percent}%
          </Typography>
        </Stack>
      )
    })}
  </Stack>
)
