import { DefinitionList } from '@/components/DefinitionList'
import { SectionCard } from '@/components/SectionCard'
import { StatusChip } from '@/components/StatusChip'
import { formatDate, formatTenure } from '@/utils/date'

export const EmploymentTab = ({ employee }) => (
  <SectionCard
    title="Employment"
    description="Role, reporting line and working arrangement"
  >
    <DefinitionList
      items={[
        { label: 'Employee ID', value: employee.employeeId },
        { label: 'Designation', value: employee.designation },
        { label: 'Department', value: employee.department },
        { label: 'Employment type', value: employee.employmentType },
        { label: 'Work location', value: employee.workLocation },
        { label: 'Reporting manager', value: employee.reportingManager },
        { label: 'Joining date', value: formatDate(employee.joiningDate) },
        { label: 'Tenure', value: formatTenure(employee.joiningDate) },
        { label: 'Employment status', value: <StatusChip status={employee.status} /> },
      ]}
    />
  </SectionCard>
)
