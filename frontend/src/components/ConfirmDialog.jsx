import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  onConfirm,
  onClose,
  children,
}) => (
  <Dialog open={open} onClose={confirming ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</DialogTitle>
    <DialogContent>
      {description ? <DialogContentText variant="body2">{description}</DialogContentText> : null}
      {children}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={confirming} variant="outlined">
        {cancelLabel}
      </Button>
      <Button onClick={onConfirm} disabled={confirming} variant="contained">
        {confirming ? 'Working…' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
)
