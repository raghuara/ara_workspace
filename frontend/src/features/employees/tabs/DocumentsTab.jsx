import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Download, FileText } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { employeeService } from '@/api/employeeService'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'

export const DocumentsTab = ({ employeeId }) => {
  const { data, loading, error, reload } = useAsync(
    employeeService.getDocuments,
    [employeeId],
  )

  return (
    <SectionCard title="Documents" description="Files held against this employee record" padded={false}>
      <QueryStateView error={error} onRetry={reload}>
        <TableContainer>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Document</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Size</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : (
              <TableBody>
                {data?.map((document) => (
                  <TableRow key={document.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <FileText size={17} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                        <Typography variant="body2" fontWeight={500}>
                          {document.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{document.category}</TableCell>
                    <TableCell>{formatDate(document.uploadedOn)}</TableCell>
                    <TableCell>{document.sizeLabel}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        disabled
                        startIcon={<Download size={15} strokeWidth={1.75} />}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
        {!loading && data?.length === 0 ? (
          <EmptyState icon={FileText} title="No documents" description="No files have been uploaded yet." />
        ) : null}
      </QueryStateView>
    </SectionCard>
  )
}
