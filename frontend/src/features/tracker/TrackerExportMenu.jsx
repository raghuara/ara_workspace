import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem, Snackbar } from '@mui/material'
import { ChevronDown, Download, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react'
import { dashboardService } from '@/api/dashboardService'
import { saveBlob } from '@/api/httpClient'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { toCsv, toWorkbook } from './trackerModel'
import { renderTableImage } from './trackerImage'

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

const OPTIONS = [
  {
    key: 'xlsx',
    label: 'Excel workbook (.xlsx)',
    hint: 'Formatted like the sheet, with filters and a Details tab',
    icon: FileSpreadsheet,
    tone: 'green',
  },
  {
    key: 'png',
    label: 'Table image (.png)',
    hint: 'A picture of the table — ready to share in chat or slides',
    icon: ImageIcon,
    tone: 'violet',
  },
  { key: 'csv', label: 'CSV (.csv)', hint: 'Plain values — opens in any spreadsheet app', icon: FileText, tone: 'blue' },
]

export const TrackerExportMenu = ({ disabled, prepare }) => {
  const [anchor, setAnchor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (format) => {
    setAnchor(null)
    const { table, details, title, subtitle, filename } = prepare()

    if (format === 'csv') {
      saveBlob(new Blob([BYTE_ORDER_MARK, toCsv(table)], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
      return
    }

    setBusy(true)
    try {
      if (format === 'png') {
        saveBlob(await renderTableImage(table, { title, subtitle }), `${filename}.png`)
      } else {
        const { blob, filename: served } = await dashboardService.exportTrackerWorkbook(
          toWorkbook(table, details, { title, subtitle, filename }),
        )
        saveBlob(blob, served ?? `${filename}.xlsx`)
      }
    } catch (caught) {
      setError(caught?.message || 'The file could not be created. Try again, or export as CSV.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={disabled || busy}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        startIcon={busy ? <CircularProgress size={13} /> : <Download size={14} strokeWidth={2} />}
        endIcon={busy ? null : <ChevronDown size={14} strokeWidth={2} />}
      >
        {busy ? 'Preparing…' : 'Export'}
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 300, maxWidth: 'calc(100vw - 24px)', borderRadius: 2 } } }}
      >
        {OPTIONS.map((option) => (
          <MenuItem key={option.key} onClick={() => run(option.key)} sx={{ py: 1, alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ mt: 0.25 }}>
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  bgcolor: STATUS_TONES[option.tone].soft,
                  color: STATUS_TONES[option.tone].strong,
                }}
              >
                <option.icon size={16} strokeWidth={1.9} aria-hidden="true" />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={option.label}
              secondary={option.hint}
              slotProps={{
                primary: { fontSize: '0.8125rem', fontWeight: 600 },
                secondary: { fontSize: '0.75rem', sx: { whiteSpace: 'normal' } },
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" variant="filled" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  )
}
