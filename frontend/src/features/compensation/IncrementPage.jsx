import { useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Divider,
  MenuItem,
  Skeleton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowLeft, ArrowRight, CircleCheck, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { DefinitionList } from '@/components/DefinitionList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { QueryStateView } from '@/components/QueryStateView'
import { compensationService } from '@/api/compensationService'
import { isForbidden } from '@/api/httpClient'
import { INCREMENT_REASONS } from '@/constants/domain'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useSubmit } from '@/hooks/useSubmit'
import { colors } from '@/theme/tokens'
import { formatDate, toIsoDate } from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/format'
import { RestrictedBanner } from './RestrictedBanner'

const STEPS = ['Select employee', 'Current compensation', 'Increment details', 'Preview & confirm']

const EMPTY_FORM = { incrementAmount: '', effectiveDate: toIsoDate(new Date()), reason: '', note: '' }

const validate = (values) => {
  const errors = {}
  const amount = Number(values.incrementAmount)

  if (!values.incrementAmount) {
    errors.incrementAmount = 'Increment amount is required.'
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.incrementAmount = 'Enter an amount greater than zero.'
  }

  if (!values.effectiveDate) errors.effectiveDate = 'Effective date is required.'
  if (!values.reason) errors.reason = 'A reason is required.'

  return errors
}

export const IncrementPage = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedEntry, setSavedEntry] = useState(null)

  const employees = useAsync(compensationService.listPayrollEmployees, [])

  const compensation = useAsync(
    compensationService.getEmployeeCompensation,
    [selectedEmployee?.id],
    { enabled: Boolean(selectedEmployee) },
  )

  const { submit, submitting, error: submitError } = useSubmit((payload) =>
    compensationService.createIncrement(payload),
  )

  const incrementAmount = Number(values.incrementAmount) || 0
  const currentGross = compensation.data?.grossSalary ?? 0
  const newGross = currentGross + incrementAmount
  const percentChange = currentGross > 0 ? (incrementAmount / currentGross) * 100 : 0

  const currentDetails = useMemo(() => {
    if (!compensation.data) return []
    const record = compensation.data
    return [
      { label: 'Employee', value: record.employee.fullName },
      { label: 'Employee ID', value: record.employee.employeeId },
      { label: 'Designation', value: record.employee.designation },
      { label: 'Department', value: record.employee.department },
      { label: 'Pay grade', value: record.payGrade },
      { label: 'Basic salary', value: formatCurrency(record.basicSalary, record.currency) },
      { label: 'Allowances', value: formatCurrency(record.allowances, record.currency) },
      { label: 'Current gross', value: formatCurrency(record.grossSalary, record.currency) },
      {
        label: 'Last increment',
        value: record.lastIncrementDate ? formatDate(record.lastIncrementDate) : 'No increment yet',
      },
    ]
  }, [compensation.data])

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const goToDetails = () => {
    setActiveStep(3)
  }

  const handleDetailsNext = () => {
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) goToDetails()
  }

  const handleConfirm = async () => {
    const entry = await submit({
      employeeId: selectedEmployee.id,
      incrementAmount,
      effectiveDate: values.effectiveDate,
      reason: values.reason,
      note: values.note,
    })

    setConfirmOpen(false)
    if (entry) {
      setSavedEntry(entry)
      setActiveStep(4)
    }
  }

  const restart = () => {
    setActiveStep(0)
    setSelectedEmployee(null)
    setValues(EMPTY_FORM)
    setErrors({})
    setSavedEntry(null)
  }

  return (
    <Box>
      <PageHeader
        title="Increment Management"
        description="Apply a salary increment through a reviewed, step-by-step flow."
        breadcrumbs={[{ label: 'Compensation', to: ROUTES.compensationOverview }, { label: 'Increment' }]}
      />

      <RestrictedBanner />

      <Card sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stepper activeStep={Math.min(activeStep, STEPS.length - 1)} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel slotProps={{ label: { style: { fontSize: '0.8125rem' } } }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Card>

      {activeStep === 4 && savedEntry ? (
        <SectionCard title="Increment saved">
          <Stack spacing={2}>
            <Alert
              icon={<CircleCheck size={18} strokeWidth={1.75} />}
              severity="success"
              sx={{ bgcolor: colors.successSoft }}
            >
              The increment for {selectedEmployee?.fullName} has been recorded and added to salary history.
            </Alert>
            <DefinitionList
              columns={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                { label: 'Previous salary', value: formatCurrency(savedEntry.previousSalary) },
                { label: 'Increment amount', value: formatCurrency(savedEntry.incrementAmount) },
                { label: 'New salary', value: formatCurrency(savedEntry.newSalary) },
                { label: 'Effective date', value: formatDate(savedEntry.effectiveDate) },
                { label: 'Reason', value: savedEntry.reason },
                { label: 'Approved by', value: savedEntry.approvedBy },
              ]}
            />
            <Box>
              <Button
                variant="outlined"
                onClick={restart}
                startIcon={<RotateCcw size={15} strokeWidth={1.75} />}
              >
                Start another increment
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      ) : null}

      {activeStep === 0 ? (
        <SectionCard title="Select employee" description="Choose whose compensation you want to review">
          <QueryStateView error={employees.error} onRetry={employees.reload}>
            <Autocomplete
              options={employees.data ?? []}
              loading={employees.loading}
              value={selectedEmployee}
              onChange={(_, option) => setSelectedEmployee(option)}
              getOptionLabel={(option) => `${option.fullName} (${option.employeeId})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Employee" size="small" required placeholder="Search by name or ID" />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props
                return (
                  <Box component="li" key={key} {...optionProps}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {option.fullName}
                      </Typography>
                      <Typography variant="caption">
                        {option.employeeId} · {option.designation} · {option.department}
                      </Typography>
                    </Box>
                  </Box>
                )
              }}
              sx={{ maxWidth: 520 }}
            />
            <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                disabled={!selectedEmployee}
                onClick={() => setActiveStep(1)}
                endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
              >
                Continue
              </Button>
            </Stack>
          </QueryStateView>
        </SectionCard>
      ) : null}

      {activeStep === 1 ? (
        <SectionCard
          title="Current compensation"
          description="Review the existing package before entering an increment"
        >
          <QueryStateView error={compensation.error} onRetry={compensation.reload}>
            {compensation.loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : (
              <DefinitionList items={currentDetails} />
            )}
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                disabled={compensation.loading || !compensation.data}
                onClick={() => setActiveStep(2)}
                endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
              >
                Enter increment
              </Button>
            </Stack>
          </QueryStateView>
        </SectionCard>
      ) : null}

      {activeStep === 2 ? (
        <SectionCard title="Increment details" description="All fields are required unless noted">
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            <TextField
              label="Increment amount (LKR)"
              value={values.incrementAmount}
              onChange={setField('incrementAmount')}
              error={Boolean(errors.incrementAmount)}
              helperText={
                errors.incrementAmount ??
                (incrementAmount > 0 && currentGross > 0
                  ? `${formatPercent(percentChange)} of current gross`
                  : ' ')
              }
              size="small"
              fullWidth
              required
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 500 } }}
            />
            <TextField
              label="Effective date"
              value={values.effectiveDate}
              onChange={setField('effectiveDate')}
              error={Boolean(errors.effectiveDate)}
              helperText={errors.effectiveDate ?? ' '}
              size="small"
              fullWidth
              required
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="Reason"
              value={values.reason}
              onChange={setField('reason')}
              error={Boolean(errors.reason)}
              helperText={errors.reason ?? ' '}
              size="small"
              fullWidth
              required
            >
              {INCREMENT_REASONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Internal note (optional)"
            value={values.note}
            onChange={setField('note')}
            size="small"
            fullWidth
            multiline
            minRows={3}
          />

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => setActiveStep(1)}
              startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleDetailsNext}
              endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
            >
              Preview
            </Button>
          </Stack>
        </SectionCard>
      ) : null}

      {activeStep === 3 ? (
        <SectionCard
          title="Preview new compensation"
          description="Check the figures carefully — this will be recorded in salary history"
        >
          {submitError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(submitError)
                ? 'You do not have permission to apply increments.'
                : (submitError.message ?? 'The increment could not be saved.')}
            </Alert>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              mb: 2.5,
            }}
          >
            {[
              { label: 'Current gross', value: formatCurrency(currentGross), tone: colors.neutralSoft },
              { label: 'Increment', value: `+ ${formatCurrency(incrementAmount)}`, tone: colors.brandSoft },
              { label: 'New gross', value: formatCurrency(newGross), tone: colors.successSoft },
            ].map((item) => (
              <Box key={item.label} sx={{ p: 2, borderRadius: 2, bgcolor: item.tone }}>
                <Typography variant="subtitle2" component="p">
                  {item.label}
                </Typography>
                <Typography variant="h2" component="p" sx={{ mt: 0.5, fontSize: '1.25rem' }}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <DefinitionList
            items={[
              { label: 'Employee', value: selectedEmployee?.fullName },
              { label: 'Employee ID', value: selectedEmployee?.employeeId },
              { label: 'Designation', value: selectedEmployee?.designation },
              { label: 'Increase', value: formatPercent(percentChange) },
              { label: 'Effective date', value: formatDate(values.effectiveDate) },
              { label: 'Reason', value: values.reason },
              { label: 'Note', value: values.note },
            ]}
          />

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => setActiveStep(2)}
              startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
              disabled={submitting}
            >
              Back
            </Button>
            <Button variant="contained" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              Confirm increment
            </Button>
          </Stack>
        </SectionCard>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm salary increment"
        description={`This will update ${selectedEmployee?.fullName ?? 'the employee'}'s gross salary from ${formatCurrency(currentGross)} to ${formatCurrency(newGross)} effective ${formatDate(values.effectiveDate)}.`}
        confirmLabel="Save increment"
        confirming={submitting}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  )
}
