import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { CalendarDays } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { TableSkeleton } from '@/components/TableSkeleton'
import { AccessRestricted } from '@/components/AccessRestricted'
import { employeeService } from '@/api/employeeService'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, formatTime } from '@/utils/date'

export const RecruitmentHistoryTab = ({ employeeId }) => {
  const { can } = usePermissions()
  const allowed = can(PERMISSIONS.INTERVIEW_VIEW)

  const { data, loading, error, reload } = useAsync(
    employeeService.getRecruitmentHistory,
    [employeeId],
    { enabled: allowed },
  )

  if (!allowed) {
    return (
      <AccessRestricted
        title="Recruitment history is restricted"
        description="Your role does not include access to interview records."
        showBackAction={false}
      />
    )
  }

  return (
    <SectionCard
      title="Recruitment history"
      description="Interviews this employee has conducted"
      padded={false}
    >
      <QueryStateView error={error} onRetry={reload}>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : (
              <TableBody>
                {data?.map((interview) => (
                  <TableRow key={interview.id} hover>
                    <TableCell>{interview.candidateName}</TableCell>
                    <TableCell>{interview.position}</TableCell>
                    <TableCell>{interview.type}</TableCell>
                    <TableCell>
                      <Box>{formatDate(interview.date)}</Box>
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {formatTime(interview.time)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={interview.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
        {!loading && data?.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No interview history"
            description="This employee has not been assigned as an interviewer."
          />
        ) : null}
      </QueryStateView>
    </SectionCard>
  )
}
