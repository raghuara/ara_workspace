import { BadgeCheck } from 'lucide-react'
import { designationService } from '@/api/catalogService'
import { CatalogPage } from './CatalogPage'

const config = {
  singular: 'Designation',
  plural: 'Designations',
  description: 'Job titles available when onboarding or editing an employee.',
  icon: BadgeCheck,
  service: designationService,
}

export const DesignationsPage = () => <CatalogPage config={config} />
