import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Plus } from 'lucide-react'
import { ToneChip } from '@/components/ToneChip'
import { TonePicker } from '@/components/TonePicker'
import { workspaceService } from '@/api/workspaceService'
import { isForbidden } from '@/api/httpClient'
import { DEFAULT_STATUS_TEMPLATES, STATUS_KINDS } from '@/constants/workspaceDomain'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const CUSTOM_KINDS = [
  { value: STATUS_KINDS.CUSTOM, label: 'Custom stage — no special behaviour' },
  { value: STATUS_KINDS.TODO, label: 'Behaves as To Do — scheduled tasks land here' },
  { value: STATUS_KINDS.PROCESSING, label: 'Behaves as In Progress' },
  { value: STATUS_KINDS.REVIEW, label: 'Behaves as Review' },
  { value: STATUS_KINDS.CORRECTION, label: 'Behaves as Correction — reopens completed tasks' },
  { value: STATUS_KINDS.COMPLETED, label: 'Behaves as Completed — counts toward points earned' },
]

export const AddGroupDialog = ({ open, onClose, onSaved }) => {
  const { activeWorkspaceId, columns } = useWorkspace()
  const existingKinds = useMemo(() => new Set(columns.map((column) => column.kind)), [columns])

  const available = DEFAULT_STATUS_TEMPLATES.filter((template) => !existingKinds.has(template.kind))

  const [selected, setSelected] = useState(() =>
    DEFAULT_STATUS_TEMPLATES.filter((t) => t.preset && !existingKinds.has(t.kind)).map((t) => t.key),
  )
  const [custom, setCustom] = useState({ name: '', kind: STATUS_KINDS.CUSTOM, tone: 'teal' })
  const [customError, setCustomError] = useState('')

  const { submit, submitting, error } = useSubmit((entries) =>
    workspaceService.createColumns(activeWorkspaceId, entries),
  )

  const toggle = (key) =>
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setCustomError('')

    const entries = available
      .filter((template) => selected.includes(template.key))
      .map((template) => ({
        name: template.name,
        kind: template.kind,
        tone: template.tone,
        isDefault: true,
      }))

    if (custom.name.trim()) {
      if (columns.some((column) => column.name.toLowerCase() === custom.name.trim().toLowerCase())) {
        setCustomError('A column with that name already exists.')
        return
      }
      entries.push({ name: custom.name.trim(), kind: custom.kind, tone: custom.tone, isDefault: false })
    }

    if (entries.length === 0) {
      setCustomError('Select a default group or name a custom one.')
      return
    }

    const saved = await submit(entries)
    if (saved) {
      onSaved?.()
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Add group</DialogTitle>

        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(error)
                ? 'You do not have permission to change this board.'
                : (error.message ?? 'The group could not be added.')}
            </Alert>
          ) : null}

          <Typography variant="subtitle2" component="p" sx={{ mb: 1 }}>
            Standard groups
          </Typography>

          {available.length === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Every standard group is already on this board. Create a custom one below.
            </Alert>
          ) : (
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              {available.map((template) => {
                const checked = selected.includes(template.key)
                return (
                  <Box
                    key={template.key}
                    component="label"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: 2,
                      border: `1px solid ${checked ? colors.brand : colors.border}`,
                      bgcolor: checked ? colors.brandSoft : colors.surface,
                      px: 1.25,
                      py: 0.75,
                      cursor: 'pointer',
                    }}
                  >
                    <Checkbox checked={checked} onChange={() => toggle(template.key)} size="small" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {template.name}
                      </Typography>
                      {template.kind === 'scheduled' ? (
                        <Typography variant="caption" component="p">
                          Holds future work until its date, then hands it to To Do.
                        </Typography>
                      ) : null}
                      {template.kind === 'completed' ? (
                        <Typography variant="caption" component="p">
                          Tasks here count toward completed points.
                        </Typography>
                      ) : null}
                    </Box>
                    <ToneChip label={template.kind} tone={template.tone} />
                  </Box>
                )
              })}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" component="p" sx={{ mb: 1.25 }}>
            Custom group
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Group name"
              value={custom.name}
              onChange={(event) => setCustom((c) => ({ ...c, name: event.target.value }))}
              size="small"
              fullWidth
              placeholder="Client Approval, On Hold, Printing…"
              error={Boolean(customError)}
              helperText={customError || ' '}
            />
            <TextField
              select
              label="Behaviour"
              value={custom.kind}
              onChange={(event) => setCustom((c) => ({ ...c, kind: event.target.value }))}
              size="small"
              fullWidth
              helperText="Behaviour decides how automations and reporting treat this column."
            >
              {CUSTOM_KINDS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TonePicker
              value={custom.tone}
              onChange={(tone) => setCustom((c) => ({ ...c, tone }))}
              previewLabel={custom.name}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={<Plus size={16} strokeWidth={2} />}
          >
            {submitting ? 'Adding…' : 'Add to board'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
