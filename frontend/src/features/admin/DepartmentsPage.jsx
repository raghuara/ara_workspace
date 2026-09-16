import { Building2 } from 'lucide-react'
import { departmentService } from '@/api/catalogService'
import { CatalogPage } from './CatalogPage'

const config = {
  singular: 'Department',
  plural: 'Departments',
  description: 'The departments employees are grouped into. Used on employee profiles and filters.',
  icon: Building2,
  service: departmentService,
}

export const DepartmentsPage = () => <CatalogPage config={config} />
