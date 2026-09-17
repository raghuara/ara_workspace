import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Copy,
  Download,
  FileSpreadsheet,
  KeyRound,
  RefreshCcw,
  TriangleAlert,
  Upload,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { employeeService } from '@/api/employeeService'
import { isForbidden, saveBlob } from '@/api/httpClient'
import { ROUTES } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { useWorkspace } from '@/hooks/useWorkspace'

const STEPS = ['Get the template', 'Upload & check', 'Import']

const TEMPLATE_COLUMNS = [
  { label: 'First name', required: true },
  { label: 'Last name', required: true },
  { label: 'Email', required: true },
  { label: 'Phone' },
  { label: 'Department', required: true, list: true },
  { label: 'Designation', required: true, list: true },
  { label: 'Joining date', required: true },
  { label: 'Status', list: true },
  { label: 'Employment type', list: true },
  { label: 'Work location', list: true },
  { label: 'Reporting manager email' },
  { label: 'Create login', list: true },
  { label: 'User type', list: true },
]

const ROW_TONES = { ready: 'green', error: 'rose', exists: 'amber' }
const ROW_LABELS = { ready: 'Ready', error: 'Fix needed', exists: 'Already exists' }

const errorMessage = (error, fallback) => {
  if (!error) return fallback
  if (isForbidden(error)) return 'You do not have permission to import employees.'
  return error.message ?? fallback
}

const toCsv = (rows) => {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const header = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'User type', 'Temporary password']
  const lines = rows.map((row) =>
    [
      row.employeeId,
      row.fullName,
      row.email,
      row.department,
      row.designation,
      row.login?.userTypeName ?? '—',
      row.login?.temporaryPassword ?? '—',
    ]
      .map(escape)
      .join(','),
  )
  return [header.map(escape).join(','), ...lines].join('\r\n')
}

const Dropzone = ({ onFile, busy, fileName }) => {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const pick = (list) => {
    const file = list?.[0]
    if (file) onFile(file)
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Upload the filled template"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        pick(event.dataTransfer.files)
      }}
      sx={{
        border: `2px dashed ${over ? colors.brand : colors.border}`,
        bgcolor: over ? colors.brandSoft : colors.page,
        borderRadius: 2.5,
        px: 3,
        py: { xs: 3, md: 4 },
        textAlign: 'center',
        cursor: busy ? 'progress' : 'pointer',
        transition: 'border-color 120ms ease, background-color 120ms ease',
        '&:hover': { borderColor: colors.brand },
        '&:focus-visible': { outline: `2px solid ${colors.brand}`, outlineOffset: 2 },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(event) => {
          pick(event.target.files)
          event.target.value = ''
        }}
      />
      <Box
        sx={{
          width: 44,
          height: 44,
          mx: 'auto',
          mb: 1.25,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: colors.brandSoft,
          color: colors.brand,
        }}
      >
        <Upload size={20} strokeWidth={1.75} aria-hidden="true" />
      </Box>
      <Typography variant="body2" fontWeight={600}>
        {fileName ? `Replace ${fileName}` : 'Drop the filled template here, or click to choose it'}
      </Typography>
      <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
        .xlsx only · up to 500 employees per file · nothing is saved until you confirm on the next step
      </Typography>
    </Box>
  )
}

const CopyButton = ({ value, label }) => {
  const [done, setDone] = useState(false)
  return (
    <Tooltip title={done ? 'Copied' : label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setDone(true)
            setTimeout(() => setDone(false), 1500)
          } catch {
            setDone(false)
          }
        }}
      >
        {done ? (
          <CircleCheck size={14} strokeWidth={2} color={STATUS_TONES.green.strong} />
        ) : (
          <Copy size={14} strokeWidth={1.75} />
        )}
      </IconButton>
    </Tooltip>
  )
}

export const EmployeeImportPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [createLogins, setCreateLogins] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()

  const downloadTemplate = async () => {
    setBusy('template')
    setError(null)
    try {
      const { blob, filename } = await employeeService.downloadImportTemplate(activeWorkspaceId)
      saveBlob(blob, filename ?? 'employee-import-template.xlsx')
    } catch (caught) {
      setError(errorMessage(caught, 'The template could not be downloaded.'))
    } finally {
      setBusy(null)
    }
  }

  const check = async (chosen) => {
    setBusy('preview')
    setError(null)
    setPreview(null)
    setFile(chosen)
    try {
      const data = await employeeService.previewImport(chosen, { workspaceId: activeWorkspaceId })
      setPreview(data)
      if (!data.canCreateLogins) setCreateLogins(false)
      setStep(1)
    } catch (caught) {
      setError(errorMessage(caught, 'The file could not be checked.'))
    } finally {
      setBusy(null)
    }
  }

  const run = async () => {
    if (!file) return
    setBusy('import')
    setError(null)
    try {
      const data = await employeeService.runImport(file, { workspaceId: activeWorkspaceId, createLogins })
      setResult(data)
      setStep(2)
    } catch (caught) {
      setError(errorMessage(caught, 'The import did not complete. Nothing was saved.'))
    } finally {
      setBusy(null)
    }
  }

  const reset = () => {
    setStep(0)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const summary = preview?.summary
  const logins = preview ? preview.rows.filter((row) => row.status === 'ready' && row.data.createLogin).length : 0

  return (
    <Box>
      <PageHeader
        title="Import employees from Excel"
        description={`Download the template, fill in one person per row, upload it, and every row that checks out joins ${activeWorkspace?.name ?? 'this workspace'} — with a login if you want one.`}
        breadcrumbs={[{ label: 'Employees', to: ROUTES.employees }, { label: 'Import' }]}
        actions={
          <Button
            component={Link}
            to={ROUTES.employees}
            variant="outlined"
            startIcon={<ArrowLeft size={15} strokeWidth={2} />}
          >
            Back to employees
          </Button>
        }
      />

      <Stepper
        activeStep={step}
        alternativeLabel
        sx={{ mb: 2.5, '& .MuiStepLabel-label': { fontSize: '0.8125rem', mt: '6px !important' } }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {step === 0 ? (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard
            title="1 · Download the template"
            description="It already knows your departments, designations and user types"
            accent="blue"
          >
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: colors.brandSoft,
                  border: `1px solid ${STATUS_TONES.blue.border}`,
                }}
              >
                <FileSpreadsheet size={28} strokeWidth={1.5} color={colors.brand} aria-hidden="true" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    employee-import-template.xlsx
                  </Typography>
                  <Typography variant="caption" component="p">
                    Dropdowns for every list column, a "How to fill this in" sheet, and hints on each heading.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Download size={15} strokeWidth={2} />}
                  onClick={downloadTemplate}
                  disabled={busy === 'template'}
                >
                  {busy === 'template' ? 'Preparing…' : 'Download'}
                </Button>
              </Stack>

              <Box>
                <Typography variant="subtitle2" component="p" sx={{ mb: 0.75 }}>
                  Columns
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }} useFlexGap>
                  {TEMPLATE_COLUMNS.map((column) => (
                    <Chip
                      key={column.label}
                      size="small"
                      label={column.required ? `${column.label} *` : column.label}
                      variant={column.required ? 'filled' : 'outlined'}
                      color={column.required ? 'primary' : 'default'}
                      sx={{
                        fontWeight: 600,
                        ...(column.required ? { bgcolor: colors.brandSoft, color: colors.brandDark } : {}),
                      }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" component="p" sx={{ mt: 0.75 }}>
                  * required · list columns only accept values from their dropdown · empty optional cells use sensible
                  defaults (Active, Full-time, Colombo HQ, login = Yes, user type = Employee)
                </Typography>
              </Box>
            </Stack>
          </SectionCard>

          <SectionCard
            title="2 · Upload the filled sheet"
            description="We check every row first and show you exactly what will happen"
            accent="teal"
          >
            <Stack spacing={1.5}>
              <Dropzone onFile={check} busy={busy === 'preview'} fileName={file?.name} />
              {busy === 'preview' ? <LinearProgress /> : null}
              <Stack spacing={0.5}>
                {[
                  'Rows with a problem are listed with the reason — fix them in Excel and upload again, or import the good rows now.',
                  'People whose email already exists are skipped, never overwritten.',
                  'Logins get a temporary password, shown once on the final screen. Everyone must change it at first sign-in.',
                ].map((line) => (
                  <Stack key={line} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <CircleCheck
                      size={14}
                      strokeWidth={2}
                      color={STATUS_TONES.teal.strong}
                      style={{ marginTop: 3, flexShrink: 0 }}
                      aria-hidden="true"
                    />
                    <Typography variant="caption">{line}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </SectionCard>
        </Box>
      ) : null}

      {step === 1 && preview ? (
        <Stack spacing={1.5}>
          <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            <StatCard
              dense
              label="Rows found"
              value={summary.total}
              helperText={preview.fileName}
              icon={FileSpreadsheet}
              tone="blue"
            />
            <StatCard
              dense
              label="Ready to import"
              value={summary.ready}
              helperText={createLogins ? `${logins} with a login` : 'employee records only'}
              icon={CircleCheck}
              tone="teal"
            />
            <StatCard
              dense
              label="Fix needed"
              value={summary.errors}
              helperText={summary.errors ? 'skipped unless fixed' : 'nothing to fix'}
              icon={summary.errors ? TriangleAlert : CircleCheck}
              tone={summary.errors ? 'rose' : 'teal'}
            />
            <StatCard
              dense
              label="Already exist"
              value={summary.exists}
              helperText="matched by email · skipped"
              icon={Users}
              tone={summary.exists ? 'amber' : 'teal'}
            />
          </Box>

          <SectionCard
            title="What will be imported"
            description="Green rows are created; red and amber rows are skipped and listed again afterwards"
            accent="blue"
            padded={false}
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                <Tooltip
                  title={
                    preview.canCreateLogins
                      ? ''
                      : 'Your role cannot manage logins, so only employee records are created.'
                  }
                >
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={createLogins}
                        disabled={!preview.canCreateLogins}
                        onChange={(event) => setCreateLogins(event.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Create logins</Typography>}
                    sx={{ m: 0 }}
                  />
                </Tooltip>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={reset}
                  startIcon={<RefreshCcw size={14} strokeWidth={2} />}
                >
                  Choose another file
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={run}
                  disabled={summary.ready === 0 || busy === 'import'}
                  endIcon={<ArrowRight size={14} strokeWidth={2} />}
                >
                  {busy === 'import'
                    ? 'Importing…'
                    : `Import ${summary.ready} ${summary.ready === 1 ? 'employee' : 'employees'}`}
                </Button>
              </Stack>
            }
          >
            {busy === 'import' ? <LinearProgress /> : null}
            <TableContainer sx={{ maxHeight: 'calc(100dvh - 380px)' }}>
              <Table size="small" stickyHeader sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }}>Row</TableCell>
                    <TableCell>Person</TableCell>
                    <TableCell>Department · Designation</TableCell>
                    <TableCell>Joining</TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell>Login</TableCell>
                    <TableCell>Check</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((row) => {
                    const problems = Object.values(row.errors)
                    const tone = STATUS_TONES[ROW_TONES[row.status]]
                    return (
                      <TableRow
                        key={row.rowNumber}
                        sx={{
                          bgcolor: row.status === 'ready' ? 'transparent' : tone.soft,
                          '& td': { verticalAlign: 'top' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.rowNumber}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {`${row.data.firstName} ${row.data.lastName}`.trim() || '—'}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="p"
                            noWrap
                            sx={{ color: row.errors.email ? tone.strong : colors.textSecondary }}
                          >
                            {row.data.email || 'no email'}
                            {row.data.phone ? ` · ${row.data.phone}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ color: row.errors.department ? tone.strong : 'inherit' }}
                          >
                            {row.data.department || '—'}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="p"
                            noWrap
                            sx={{ color: row.errors.designation ? tone.strong : colors.textSecondary }}
                          >
                            {row.data.designation || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ color: row.errors.joiningDate ? tone.strong : 'inherit' }}
                          >
                            {row.errors.joiningDate ? row.data.joiningDate || '—' : formatDate(row.data.joiningDate)}
                          </Typography>
                          <Typography variant="caption" component="p" noWrap>
                            {row.data.status} · {row.data.employmentType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{ color: row.errors.reportingManagerEmail ? tone.strong : colors.textSecondary }}
                          >
                            {row.data.reportingManagerEmail ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {row.data.createLogin && createLogins ? (
                            <ToneChip label={row.data.userTypeName ?? 'Employee'} tone="violet" icon={KeyRound} />
                          ) : (
                            <Typography variant="caption">No login</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 240 }}>
                          <ToneChip label={ROW_LABELS[row.status]} tone={ROW_TONES[row.status]} />
                          {problems.length > 0 ? (
                            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                              {problems.map((problem) => (
                                <Typography key={problem} component="li" variant="caption" sx={{ color: tone.strong }}>
                                  {problem}
                                </Typography>
                              ))}
                            </Box>
                          ) : null}
                          {row.warnings.map((warning) => (
                            <Typography
                              key={warning}
                              variant="caption"
                              component="p"
                              sx={{ mt: 0.5, color: STATUS_TONES.amber.strong }}
                            >
                              {warning}
                            </Typography>
                          ))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Stack>
      ) : null}

      {step === 2 && result ? (
        <Stack spacing={1.5}>
          <Alert severity="success" icon={<CircleCheck size={18} strokeWidth={2} />}>
            <strong>{result.summary.created}</strong> {result.summary.created === 1 ? 'employee' : 'employees'} created
            {result.summary.logins ? (
              <>
                , <strong>{result.summary.logins}</strong> with a login
              </>
            ) : null}
            {result.summary.skipped ? ` · ${result.summary.skipped} skipped` : ''}.
            {result.summary.logins
              ? ' Temporary passwords are shown once below — download or copy them before you leave this page.'
              : ''}
          </Alert>

          <SectionCard
            title="Created"
            description={
              result.summary.logins
                ? 'Everyone must change their password the first time they sign in'
                : 'Employee records without logins — you can add logins later under Administration → Accounts'
            }
            accent="green"
            padded={false}
            action={
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {result.summary.logins ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Download size={14} strokeWidth={2} />}
                    onClick={() =>
                      saveBlob(
                        new Blob([toCsv(result.created)], { type: 'text/csv;charset=utf-8' }),
                        `employee-logins-${new Date().toISOString().slice(0, 10)}.csv`,
                      )
                    }
                  >
                    Download credentials (CSV)
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={reset}
                  startIcon={<Upload size={14} strokeWidth={2} />}
                >
                  Import another file
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate(ROUTES.employees)}
                  endIcon={<ArrowRight size={14} strokeWidth={2} />}
                >
                  Go to employees
                </Button>
              </Stack>
            }
          >
            <TableContainer>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Department · Designation</TableCell>
                    <TableCell>Login</TableCell>
                    <TableCell>Temporary password</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.created.map((row) => (
                    <TableRow key={row.employeeId} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <UserAvatar name={row.fullName} size={28} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {row.fullName}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {row.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {row.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {row.department}
                        </Typography>
                        <Typography variant="caption" component="p" noWrap>
                          {row.designation}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.login ? (
                          <ToneChip label={row.login.userTypeName} tone="violet" icon={KeyRound} />
                        ) : (
                          <Typography variant="caption">No login</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.login ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {row.login.temporaryPassword}
                            </Typography>
                            <CopyButton value={row.login.temporaryPassword} label="Copy password" />
                          </Stack>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          {result.skipped.length > 0 ? (
            <SectionCard
              title="Skipped"
              description="Fix these in the sheet and upload just those rows again"
              accent="amber"
              padded={false}
            >
              <TableContainer>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 56 }}>Row</TableCell>
                      <TableCell>Person</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.skipped.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {row.fullName || '—'}
                          </Typography>
                          <Typography variant="caption" component="p" noWrap>
                            {row.email || 'no email'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: STATUS_TONES.amber.strong }}>
                            {row.reason}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  )
}
