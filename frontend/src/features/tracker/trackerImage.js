const FONT = 'Inter, "Segoe UI", system-ui, sans-serif'
const MAX_CANVAS_SIDE = 30000

const PALETTE = {
  navy: '#173B6C',
  brand: '#2563EB',
  ink: '#172033',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  zebra: '#F8FAFC',
  total: '#DBEAFE',
  count: '#1D4ED8',
  page: '#FFFFFF',
}

const TONES = {
  blue: { soft: '#EFF6FF', tint: '#E5F0FE', strong: '#1D4ED8' },
  green: { soft: '#DCFCE7', tint: '#E6FCED', strong: '#15803D' },
  amber: { soft: '#FEF3C7', tint: '#FEF7D9', strong: '#B45309' },
  rose: { soft: '#FFE4E6', tint: '#FFEAEC', strong: '#BE123C' },
  violet: { soft: '#F5F3FF', tint: '#EFEBFE', strong: '#6D28D9' },
  teal: { soft: '#F0FDFA', tint: '#E0FBF5', strong: '#0F766E' },
  orange: { soft: '#FFF7ED', tint: '#FFF2E1', strong: '#C2410C' },
  slate: { soft: '#F1F5F9', tint: '#EAEFF5', strong: '#475569' },
}

const PAD = 24
const TITLE_H = 56
const SUBTITLE_H = 32
const SECTION_H = 26
const HEADER_H = 62
const ROW_H = 34

const percentTone = (value) => (value === null || value === undefined ? null : value >= 100 ? 'green' : value >= 80 ? 'amber' : 'rose')

const display = (column, value) => {
  if (column.kind === 'percent') return typeof value === 'number' ? `${value.toFixed(1)}%` : '—'
  if (value === null || value === undefined || value === '') return column.kind === 'count' ? '0' : ''
  return String(value)
}

const wrapWords = (context, text, width) => {
  const lines = []
  let line = ''
  text.split(' ').forEach((word) => {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  })
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

const fitText = (context, text, width) => {
  if (context.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && context.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut}…`
}

const measureColumns = (context, table) =>
  table.columns.map((column, index) => {
    context.font = `700 13px ${FONT}`
    const headerWords = Math.max(...column.label.split(' ').map((word) => context.measureText(word).width))
    context.font = `400 14px ${FONT}`
    const widest = table.rows.reduce(
      (max, row) => Math.max(max, context.measureText(display(column, row.cells[index])).width),
      0,
    )
    const content = Math.max(headerWords, widest) + 28
    if (column.kind === 'text') return Math.min(Math.max(content, 64), 240)
    if (column.kind === 'percent') return Math.min(Math.max(content, 96), 130)
    return Math.min(Math.max(content, 84), 120)
  })

export const renderTableImage = async (table, { title, subtitle }) => {
  if (document.fonts?.ready) await document.fonts.ready

  const probe = document.createElement('canvas').getContext('2d')
  const widths = measureColumns(probe, table)
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)
  const width = tableWidth + PAD * 2
  const height = PAD * 2 + TITLE_H + SUBTITLE_H + SECTION_H + HEADER_H + table.rows.length * ROW_H

  const scale = Math.max(1, Math.min(2, Math.floor(MAX_CANVAS_SIDE / Math.max(width, height))))
  if (Math.max(width, height) > MAX_CANVAS_SIDE) {
    throw new Error('This table is too long for an image. Narrow the period or team, or export to Excel instead.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const context = canvas.getContext('2d')
  context.scale(scale, scale)
  context.textBaseline = 'middle'

  context.fillStyle = PALETTE.page
  context.fillRect(0, 0, width, height)

  const left = PAD
  let top = PAD

  context.fillStyle = PALETTE.navy
  context.fillRect(left, top, tableWidth, TITLE_H)
  context.fillStyle = '#FFFFFF'
  context.font = `800 22px ${FONT}`
  context.textAlign = 'left'
  context.fillText(fitText(context, title, tableWidth - 32), left + 16, top + TITLE_H / 2)
  top += TITLE_H

  context.fillStyle = PALETTE.muted
  context.font = `italic 400 13px ${FONT}`
  context.fillText(fitText(context, subtitle, tableWidth - 32), left + 16, top + SUBTITLE_H / 2)
  top += SUBTITLE_H

  const xs = widths.reduce((acc, columnWidth, index) => [...acc, acc[index] + columnWidth], [left])

  let start = 0
  while (start < table.columns.length) {
    let end = start
    while (end + 1 < table.columns.length && table.columns[end + 1].section === table.columns[start].section) end += 1
    const section = table.columns[start].section
    if (section) {
      const tone = TONES[table.columns[start].sectionTone] ?? TONES.blue
      context.fillStyle = tone.tint
      context.fillRect(xs[start], top, xs[end + 1] - xs[start], SECTION_H)
      context.fillStyle = tone.strong
      context.font = `700 11px ${FONT}`
      context.textAlign = 'center'
      context.fillText(section.toUpperCase(), (xs[start] + xs[end + 1]) / 2, top + SECTION_H / 2)
    }
    start = end + 1
  }
  top += SECTION_H

  context.fillStyle = PALETTE.brand
  context.fillRect(left, top, tableWidth, HEADER_H)
  context.font = `700 13px ${FONT}`
  context.fillStyle = '#FFFFFF'
  table.columns.forEach((column, index) => {
    const lines = wrapWords(context, column.label, widths[index] - 16)
    const lineHeight = 16
    const firstY = top + HEADER_H / 2 - ((lines.length - 1) * lineHeight) / 2
    context.textAlign = column.kind === 'text' ? 'left' : 'center'
    const x = column.kind === 'text' ? xs[index] + 10 : xs[index] + widths[index] / 2
    lines.forEach((line, lineIndex) => context.fillText(line, x, firstY + lineIndex * lineHeight))
  })
  context.strokeStyle = 'rgba(255,255,255,0.25)'
  context.lineWidth = 1
  xs.slice(1, -1).forEach((x) => {
    context.beginPath()
    context.moveTo(x + 0.5, top + 8)
    context.lineTo(x + 0.5, top + HEADER_H - 8)
    context.stroke()
  })
  top += HEADER_H

  let lastGroup = null
  let shaded = true
  table.rows.forEach((row) => {
    const isTotal = row.style === 'total'
    if (row.group !== lastGroup) {
      shaded = !shaded
      lastGroup = row.group
    }
    context.fillStyle = isTotal ? PALETTE.total : shaded ? PALETTE.zebra : PALETTE.page
    context.fillRect(left, top, tableWidth, ROW_H)

    row.cells.forEach((value, index) => {
      const column = table.columns[index]
      const x = xs[index]
      const cellWidth = widths[index]
      const text = display(column, value)
      const positive = typeof value === 'number' && value > 0

      if (column.kind === 'percent') {
        const tone = percentTone(typeof value === 'number' ? value : null)
        if (tone) {
          context.fillStyle = TONES[tone].soft
          context.fillRect(x, top, cellWidth, ROW_H)
        }
        context.fillStyle = tone ? TONES[tone].strong : PALETTE.faint
        context.font = `700 14px ${FONT}`
        context.textAlign = 'center'
      } else if (column.kind === 'count') {
        if (column.shade && positive && !isTotal) {
          context.fillStyle = (TONES[column.shade] ?? TONES.amber).soft
          context.fillRect(x, top, cellWidth, ROW_H)
        }
        context.fillStyle = isTotal ? PALETTE.ink : positive ? PALETTE.count : PALETTE.faint
        context.font = `${isTotal || positive ? 700 : 400} 14px ${FONT}`
        context.textAlign = 'center'
      } else {
        context.fillStyle = PALETTE.ink
        context.font = `${isTotal ? 700 : 400} 14px ${FONT}`
        context.textAlign = 'left'
      }

      const textX = context.textAlign === 'center' ? x + cellWidth / 2 : x + 10
      context.fillText(fitText(context, text, cellWidth - 16), textX, top + ROW_H / 2 + 1)
    })

    context.strokeStyle = isTotal ? PALETTE.navy : PALETTE.border
    context.lineWidth = isTotal ? 2 : 1
    context.beginPath()
    context.moveTo(left, top + (isTotal ? 1 : 0.5))
    context.lineTo(left + tableWidth, top + (isTotal ? 1 : 0.5))
    context.stroke()
    top += ROW_H
  })

  context.strokeStyle = PALETTE.border
  context.lineWidth = 1
  const gridTop = PAD + TITLE_H + SUBTITLE_H + SECTION_H + HEADER_H
  xs.forEach((x) => {
    context.beginPath()
    context.moveTo(x + 0.5, gridTop)
    context.lineTo(x + 0.5, top)
    context.stroke()
  })
  context.beginPath()
  context.moveTo(left, top - 0.5)
  context.lineTo(left + tableWidth, top - 0.5)
  context.stroke()

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))), 'image/png'),
  )
}
