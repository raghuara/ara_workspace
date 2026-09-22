import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { FileText, ImagePlus, Trash2, X } from 'lucide-react'
import { attachmentService } from '@/api/attachmentService'
import { isForbidden } from '@/api/httpClient'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const isImage = (attachment) => attachment.mimeType?.startsWith('image/')

/**
 * Reference images and files on a task. Uploads go straight to the real
 * attachments API even though tasks are still mock — the backend only checks
 * the id format for task owners, so the two can be wired up independently.
 *
 * Listed URLs are short-lived signed links; the list is re-fetched after every
 * change rather than patched, so a stale link is never shown.
 */
export const TaskAttachments = ({ taskId, canEdit, compact = false }) => {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const attachments = useAsync(attachmentService.list, ['task', taskId], {
    enabled: Boolean(taskId),
    keepPrevious: false,
  })
  const items = attachments.data ?? []
  const images = items.filter(isImage)
  const files = items.filter((item) => !isImage(item))

  const handleFiles = async (fileList) => {
    const chosen = Array.from(fileList ?? [])
    if (chosen.length === 0) return

    const tooBig = chosen.find((file) => file.type.startsWith('image/') && file.size > MAX_IMAGE_BYTES)
    if (tooBig) {
      setError(`${tooBig.name} is over 5 MB. Images must be 5 MB or smaller.`)
      return
    }

    setError('')
    setUploading(true)
    setProgress({ done: 0, total: chosen.length })
    try {
      // Sequential on purpose: keeps the progress honest and avoids hammering
      // the upload endpoint with a burst of parallel multipart requests.
      for (const file of chosen) {
        await attachmentService.upload({ ownerType: 'task', ownerId: taskId, file, category: 'reference' })
        setProgress((current) => ({ ...current, done: current.done + 1 }))
      }
      attachments.reload()
    } catch (caught) {
      setError(
        isForbidden(caught)
          ? 'You do not have permission to add files to this task.'
          : (caught.message ?? 'The upload failed. Please try again.'),
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (attachment) => {
    setError('')
    try {
      await attachmentService.remove(attachment.id)
      if (preview?.id === attachment.id) setPreview(null)
      attachments.reload()
    } catch (caught) {
      setError(caught.message ?? 'The file could not be removed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" component="p">
          Reference images &amp; files
          {items.length > 0 ? (
            <Typography component="span" variant="caption" sx={{ ml: 0.75 }}>
              ({items.length})
            </Typography>
          ) : null}
        </Typography>
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(event) => handleFiles(event.target.files)}
              aria-label="Choose files to attach"
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ImagePlus size={14} strokeWidth={1.75} />}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `Uploading ${progress.done}/${progress.total}…` : 'Add images'}
            </Button>
          </>
        ) : null}
      </Stack>

      {uploading ? (
        <LinearProgress
          variant="determinate"
          value={progress.total ? (progress.done / progress.total) * 100 : 0}
          aria-label="Upload progress"
          sx={{ mb: 1 }}
        />
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {attachments.loading ? (
        <LinearProgress aria-label="Loading attachments" />
      ) : attachments.error ? (
        <Alert severity="warning">
          {isForbidden(attachments.error)
            ? 'You cannot view files on this task.'
            : 'Files could not be loaded right now.'}
        </Alert>
      ) : items.length === 0 ? (
        <Box
          onClick={canEdit ? () => inputRef.current?.click() : undefined}
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
          onKeyDown={(event) => {
            if (canEdit && event.key === 'Enter') inputRef.current?.click()
          }}
          sx={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 2,
            py: compact ? 2 : 3,
            textAlign: 'center',
            color: colors.textSecondary,
            cursor: canEdit ? 'pointer' : 'default',
            '&:hover': canEdit ? { borderColor: colors.brand, bgcolor: colors.brandSoft } : undefined,
          }}
        >
          <ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />
          <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
            {canEdit ? 'Add reference images, mockups or briefs' : 'No files attached'}
          </Typography>
        </Box>
      ) : (
        <>
          {images.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: `repeat(${compact ? 4 : 3}, 1fr)` },
                mb: files.length ? 1.5 : 0,
              }}
            >
              {images.map((image) => (
                <Box
                  key={image.id}
                  sx={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`,
                    bgcolor: colors.neutralSoft,
                    '&:hover .attachment-remove': { opacity: 1 },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setPreview(image)}
                    aria-label={`Open ${image.name}`}
                    sx={{
                      p: 0,
                      border: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'zoom-in',
                      bgcolor: 'transparent',
                      display: 'block',
                    }}
                  >
                    <Box
                      component="img"
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                  {canEdit ? (
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        className="attachment-remove"
                        aria-label={`Remove ${image.name}`}
                        onClick={() => remove(image)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          opacity: 0,
                          bgcolor: 'rgba(255,255,255,0.92)',
                          '&:hover': { bgcolor: colors.surface },
                          transition: 'opacity 120ms ease',
                        }}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              ))}
            </Box>
          ) : null}

          {files.map((file) => (
            <Stack
              key={file.id}
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                border: `1px solid ${colors.border}`,
                mb: 0.75,
              }}
            >
              <FileText size={15} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
              <Box
                component="a"
                href={file.url}
                target="_blank"
                rel="noreferrer"
                sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
              >
                <Typography variant="body2" fontWeight={500} noWrap>
                  {file.name}
                </Typography>
                <Typography variant="caption" component="p">
                  {file.sizeLabel}
                </Typography>
              </Box>
              {canEdit ? (
                <IconButton size="small" aria-label={`Remove ${file.name}`} onClick={() => remove(file)}>
                  <Trash2 size={14} strokeWidth={1.75} />
                </IconButton>
              ) : null}
            </Stack>
          ))}
        </>
      )}

      {preview ? (
        <Dialog open onClose={() => setPreview(null)} maxWidth="lg">
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', px: 2, py: 1, borderBottom: `1px solid ${colors.border}` }}
          >
            <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
              {preview.name}
            </Typography>
            <Typography variant="caption">{preview.sizeLabel}</Typography>
            <IconButton size="small" aria-label="Close preview" onClick={() => setPreview(null)}>
              <X size={16} strokeWidth={1.75} />
            </IconButton>
          </Stack>
          <Box sx={{ bgcolor: '#0f172a', display: 'grid', placeItems: 'center', p: 1 }}>
            <Box
              component="img"
              src={preview.url}
              alt={preview.name}
              sx={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          </Box>
        </Dialog>
      ) : null}
    </Box>
  )
}
