import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { Building2, CircleCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ToneChip } from '@/components/ToneChip'
import { ROUTES } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

const REASONS = {
  owner: { label: 'Owner', tone: 'rose', hint: 'The workspace owner is always its admin.' },
  'only-admin': { label: 'Only admin', tone: 'rose', hint: 'Add another admin to this workspace first.' },
  outside: { label: 'Not yours', tone: 'amber', hint: 'Only a Master Admin can change admins here.' },
}

const Consequence = ({ children }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
    <CircleCheck size={15} strokeWidth={2} color={STATUS_TONES.blue.strong} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
    <Typography variant="body2">{children}</Typography>
  </Stack>
)

export const AdminRoleDialog = ({ change, confirming, onConfirm, onClose }) => {
  const blocked = change.code === 'WORKSPACE_ADMIN_REQUIRED'
  const { fullName } = change.row

  return (
    <Dialog open onClose={confirming ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {blocked ? `${fullName} can't be an Employee yet` : `Change ${fullName} to ${change.typeName}?`}
      </DialogTitle>
      <DialogContent>
        {blocked ? (
          <Alert severity="warning" icon={<TriangleAlert size={18} strokeWidth={1.75} />} sx={{ mb: 2 }}>
            {change.message}
          </Alert>
        ) : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Employees only work the tasks assigned to them, so they can't also be workspace admins. Confirming will:
            </Typography>
            <Consequence>Remove them as admin of the workspaces below.</Consequence>
            <Consequence>Keep them as a member there — they'll see only the tasks assigned to them.</Consequence>
            <Consequence>Give them Employee permissions (task permissions only).</Consequence>
          </Stack>
        )}

        <Typography variant="subtitle2" component="p" sx={{ mb: 0.75 }}>
          Admin of
        </Typography>
        <Stack sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
          {change.workspaces.map((workspace) => {
            const reason = REASONS[workspace.reason]
            return (
              <Stack
                key={workspace.id}
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', px: 1.5, py: 1, borderBottom: `1px solid ${colors.border}`, '&:last-of-type': { borderBottom: 0 } }}
              >
                <Box sx={{ display: 'inline-flex', color: colors.textSecondary }}>
                  <Building2 size={15} strokeWidth={1.75} aria-hidden="true" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {workspace.name}
                  </Typography>
                  {reason ? (
                    <Typography variant="caption" component="p">
                      {reason.hint}
                    </Typography>
                  ) : null}
                </Box>
                {reason ? (
                  <ToneChip label={reason.label} tone={reason.tone} />
                ) : (
                  <ToneChip label={blocked ? 'Can be removed' : 'Admin removed'} tone={blocked ? 'slate' : 'amber'} />
                )}
              </Stack>
            )
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        {blocked ? (
          <>
            <Button onClick={onClose} variant="outlined">
              Close
            </Button>
            <Button component={Link} to={ROUTES.adminWorkspaces} variant="contained">
              Open workspace setup
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} variant="outlined" disabled={confirming}>
              Keep as {change.row.userTypeName}
            </Button>
            <Button onClick={onConfirm} variant="contained" color="warning" disabled={confirming}>
              {confirming ? 'Changing…' : `Remove as admin and change`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
