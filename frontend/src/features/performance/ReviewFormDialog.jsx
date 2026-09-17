import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Rating,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Plus, Trash2 } from 'lucide-react'
import { PeoplePicker } from '@/components/PeoplePicker'
import { employeeService } from '@/api/employeeService'
import { performanceService } from '@/api/performanceService'
import { GOAL_STATUSES, PERFORMANCE_STATUS, reviewPeriodOptions } from '@/constants/domain'
import { useAsync } from '@/hooks/useAsync'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const STATUS_OPTIONS = Object.values(PERFORMANCE_STATUS)
const PERIODS = reviewPeriodOptions()

const ListEditor = ({ label, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    setDraft('')
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: items.length ? 1 : 0 }}>
        {items.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            onDelete={() => onChange(items.filter((candidate) => candidate !== item))}
          />
        ))}
      </Stack>
      <TextField
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            add()
          }
        }}
        size="small"
        fullWidth
        placeholder={placeholder}
        slotProps={{
          input: {
            endAdornment: (
              <Button size="small" onClick={add} disabled={!draft.trim()}>
                Add
              </Button>
            ),
          },
        }}
      />
    </Box>
  )
}

const GoalsEditor = ({ goals, onChange }) => {
  const update = (index, patch) => onChange(goals.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)))

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Goals
        </Typography>
        <Button
          size="small"
          startIcon={<Plus size={14} strokeWidth={2} />}
          onClick={() => onChange([...goals, { title: '', progress: 0, status: 'On Track' }])}
          disabled={goals.length >= 12}
        >
          Add goal
        </Button>
      </Stack>
      <Stack spacing={1.25}>
        {goals.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No goals yet.
          </Typography>
        ) : null}
        {goals.map((goal, index) => (
          <Box key={index} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                value={goal.title}
                onChange={(event) => update(index, { title: event.target.value })}
                size="small"
                fullWidth
                placeholder="Goal"
                sx={{ flex: 1 }}
              />
              <TextField
                select
                value={goal.status}
                onChange={(event) => update(index, { status: event.target.value })}
                size="small"
                sx={{ minWidth: 130 }}
              >
                {GOAL_STATUSES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <Tooltip title="Remove goal">
                <IconButton
                  size="small"
                  onClick={() => onChange(goals.filter((_, i) => i !== index))}
                  sx={{ color: colors.danger }}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1, px: 0.5 }}>
              <Slider
                value={goal.progress}
                onChange={(_, value) => update(index, { progress: Array.isArray(value) ? value[0] : value })}
                step={5}
                min={0}
                max={100}
                size="small"
                sx={{ flex: 1 }}
              />
              <Typography variant="caption" sx={{ width: 40, textAlign: 'right' }}>
                {goal.progress}%
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

const ReviewForm = ({ review, presetEmployeeId, onClose, onSaved }) => {
  const isEditing = Boolean(review)
  const [values, setValues] = useState({
    employeeId: review?.employeeId ?? presetEmployeeId ?? '',
    reviewerId: review?.reviewerId ?? '',
    reviewPeriod: review?.reviewPeriod ?? PERIODS[0],
    status: review?.status ?? PERFORMANCE_STATUS.DRAFT,
    overallRating: review?.overallRating ?? null,
    goals: review?.goals?.map(({ title, progress, status }) => ({ title, progress, status })) ?? [],
    strengths: review?.strengths ?? [],
    improvementAreas: review?.improvementAreas ?? [],
    managerComments: review?.managerComments ?? '',
    employeeComments: review?.employeeComments ?? '',
  })
  const [errors, setErrors] = useState({})

  const { activeWorkspaceId } = useWorkspace()
  const { data: people } = useAsync(employeeService.getEmployeeOptions, [activeWorkspaceId], { enabled: Boolean(activeWorkspaceId) })
  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing ? performanceService.saveReview(review.id, payload) : performanceService.createReview(payload),
  )

  const set = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!values.employeeId) next.employeeId = 'Choose an employee.'
    if (!values.reviewPeriod.trim()) next.reviewPeriod = 'Review period is required.'
    if (values.status === PERFORMANCE_STATUS.COMPLETED && !values.overallRating)
      next.overallRating = 'A completed review needs an overall rating.'
    if (values.goals.some((goal) => !goal.title.trim())) next.goals = 'Every goal needs a title.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const saved = await submit({
      ...values,
      reviewerId: values.reviewerId || null,
      goals: values.goals.map((goal) => ({ ...goal, title: goal.title.trim() })),
    })
    if (saved) onSaved(saved)
  }

  const serverErrors = error?.details ?? {}
  const fieldError = (field) => errors[field] ?? serverErrors[field]

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {isEditing ? `Edit review — ${review.employeeName}` : 'New performance review'}
      </DialogTitle>
      <DialogContent dividers>
        {error && !error.details ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message ?? 'The review could not be saved.'}
          </Alert>
        ) : null}

        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            <PeoplePicker
              label="Employee"
              options={people ?? []}
              value={values.employeeId}
              onChange={(next) => set('employeeId', next)}
              required
              disabled={isEditing}
              error={fieldError('employeeId')}
              helperText=" "
            />
            <PeoplePicker
              label="Reviewer"
              options={(people ?? []).filter((person) => person.id !== values.employeeId)}
              value={values.reviewerId}
              onChange={(next) => set('reviewerId', next)}
              error={fieldError('reviewerId')}
              helperText="Usually the reporting manager."
            />
            <TextField
              select
              label="Review period"
              value={values.reviewPeriod}
              onChange={(event) => set('reviewPeriod', event.target.value)}
              size="small"
              fullWidth
              required
              error={Boolean(fieldError('reviewPeriod'))}
              helperText={fieldError('reviewPeriod') ?? ' '}
            >
              {[...new Set([values.reviewPeriod, ...PERIODS])].filter(Boolean).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={values.status}
              onChange={(event) => set('status', event.target.value)}
              size="small"
              fullWidth
              helperText=" "
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              Overall rating
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Rating
                value={values.overallRating ?? 0}
                precision={0.5}
                onChange={(_, value) => set('overallRating', value)}
                size="large"
              />
              <Typography variant="body2" fontWeight={600}>
                {values.overallRating ? `${values.overallRating.toFixed(1)} / 5` : 'Not rated'}
              </Typography>
            </Stack>
            {fieldError('overallRating') ? (
              <Typography variant="caption" color="error">
                {fieldError('overallRating')}
              </Typography>
            ) : null}
          </Box>

          <GoalsEditor goals={values.goals} onChange={(next) => set('goals', next)} />
          {fieldError('goals') ? (
            <Typography variant="caption" color="error">
              {fieldError('goals')}
            </Typography>
          ) : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            <ListEditor
              label="Strengths"
              items={values.strengths}
              onChange={(next) => set('strengths', next)}
              placeholder="Add a strength and press Enter"
            />
            <ListEditor
              label="Areas to improve"
              items={values.improvementAreas}
              onChange={(next) => set('improvementAreas', next)}
              placeholder="Add an area and press Enter"
            />
          </Box>

          <TextField
            label="Manager comments"
            value={values.managerComments}
            onChange={(event) => set('managerComments', event.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label="Employee comments"
            value={values.employeeComments}
            onChange={(event) => set('employeeComments', event.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            placeholder="The employee's response, if any"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save review' : 'Create review'}
        </Button>
      </DialogActions>
    </Box>
  )
}

export const ReviewFormDialog = ({ open, review = null, presetEmployeeId, onClose, onSaved }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <ReviewForm review={review} presetEmployeeId={presetEmployeeId} onClose={onClose} onSaved={onSaved} />
  </Dialog>
)
