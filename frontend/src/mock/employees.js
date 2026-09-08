import { EMPLOYMENT_STATUS } from '@/constants/domain'
import { daysFromNow } from '@/utils/date'

const { ACTIVE, PROBATION, NOTICE_PERIOD, INACTIVE } = EMPLOYMENT_STATUS

const seed = [
  ['Amara', 'Perera', 'Engineering', 'Engineering Manager', '2018-02-12', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Nuwan', 'Fernando', 'Engineering', 'Senior Software Engineer', '2019-06-03', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0001'],
  ['Sanduni', 'Jayasuriya', 'Engineering', 'Software Engineer', '2021-09-20', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0001'],
  ['Kasun', 'Rathnayake', 'Engineering', 'Software Engineer', '2022-01-10', ACTIVE, 'Full-time', 'Remote', 'EMP-0001'],
  ['Dilini', 'Wickramasinghe', 'Engineering', 'Associate Software Engineer', '2024-07-01', PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0002'],
  ['Tharindu', 'Silva', 'Engineering', 'DevOps Engineer', '2020-11-16', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0001'],
  ['Ishara', 'Bandara', 'Engineering', 'Senior Software Engineer', '2019-03-25', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0001'],
  ['Ruwan', 'Gunasekara', 'Engineering', 'Software Engineer', '2023-02-06', ACTIVE, 'Contract', 'Remote', 'EMP-0002'],
  ['Hasini', 'Karunaratne', 'Product', 'Head of Product', '2017-08-14', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Chamath', 'Weerasinghe', 'Product', 'Senior Product Manager', '2020-04-27', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0009'],
  ['Nethmi', 'Dissanayake', 'Product', 'Product Manager', '2022-05-09', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0009'],
  ['Yasas', 'Herath', 'Product', 'Business Analyst', '2023-10-02', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0010'],
  ['Piumi', 'Senanayake', 'Design', 'Design Lead', '2019-01-21', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Lahiru', 'Abeysekara', 'Design', 'Senior UI/UX Designer', '2021-07-12', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0013'],
  ['Sachini', 'Ekanayake', 'Design', 'UI/UX Designer', '2023-03-13', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0013'],
  ['Malith', 'Rajapaksa', 'Design', 'Graphic Designer', '2024-09-16', PROBATION, 'Part-time', 'Remote', 'EMP-0013'],
  ['Thilini', 'Amarasinghe', 'Quality Assurance', 'QA Lead', '2019-05-06', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Janith', 'Wijesinghe', 'Quality Assurance', 'Senior QA Engineer', '2021-02-15', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0017'],
  ['Upeksha', 'Kumari', 'Quality Assurance', 'QA Engineer', '2022-11-07', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0017'],
  ['Dinuka', 'Madushanka', 'Quality Assurance', 'QA Engineer', '2024-01-08', ACTIVE, 'Full-time', 'Remote', 'EMP-0017'],
  ['Shanika', 'Peiris', 'Human Resources', 'HR Manager', '2018-09-03', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Roshan', 'De Silva', 'Human Resources', 'Senior HR Executive', '2020-08-17', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0021'],
  ['Anjali', 'Mendis', 'Human Resources', 'Recruitment Specialist', '2022-03-14', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0021'],
  ['Gayan', 'Liyanage', 'Human Resources', 'HR Executive', -86, PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0021'],
  ['Chathura', 'Samarasinghe', 'Finance', 'Finance Manager', '2017-11-20', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Nadeesha', 'Gamage', 'Finance', 'Senior Accountant', '2020-02-24', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0025'],
  ['Buddhika', 'Ranasinghe', 'Finance', 'Accountant', '2022-07-18', ACTIVE, 'Full-time', 'Kandy Office', 'EMP-0025'],
  ['Iresha', 'Kodikara', 'Finance', 'Payroll Officer', '2023-05-22', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0025'],
  ['Pasindu', 'Jayawardena', 'Sales', 'Head of Sales', '2018-04-09', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Menaka', 'Alwis', 'Sales', 'Senior Sales Executive', '2020-10-05', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0029'],
  ['Sahan', 'Pathirana', 'Sales', 'Sales Executive', '2022-09-12', ACTIVE, 'Full-time', 'Kandy Office', 'EMP-0029'],
  ['Kavindi', 'Nanayakkara', 'Sales', 'Sales Executive', '2023-12-04', ACTIVE, 'Full-time', 'Colombo HQ', 'EMP-0029'],
  ['Dulanjali', 'Seneviratne', 'Sales', 'Sales Coordinator', '2021-06-28', NOTICE_PERIOD, 'Full-time', 'Colombo HQ', 'EMP-0029'],
  ['Ravindu', 'Jayakody', 'Customer Success', 'Customer Success Manager', '2019-10-14', ACTIVE, 'Full-time', 'Colombo HQ', null],
  ['Hiruni', 'Wanigasooriya', 'Customer Success', 'Senior Support Engineer', '2021-04-19', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0034'],
  ['Tharaka', 'Munasinghe', 'Customer Success', 'Support Engineer', '2023-01-23', ACTIVE, 'Full-time', 'Remote', 'EMP-0034'],
  ['Ashini', 'Kaluarachchi', 'Customer Success', 'Support Engineer', -58, PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0034'],
  ['Supun', 'Withanage', 'Customer Success', 'Support Associate', '2022-02-21', INACTIVE, 'Contract', 'Remote', 'EMP-0034'],
  ['Nimesha', 'Wijeratne', 'Engineering', 'Software Engineer', -71, PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0002'],
  ['Chalana', 'Dias', 'Engineering', 'Intern Software Engineer', -24, PROBATION, 'Intern', 'Colombo HQ', 'EMP-0007'],
  ['Vishwa', 'Ariyaratne', 'Product', 'Associate Product Manager', '2024-04-15', ACTIVE, 'Full-time', 'Hybrid', 'EMP-0010'],
  ['Sewwandi', 'Rodrigo', 'Design', 'Product Designer', -41, PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0013'],
  ['Lakmal', 'Gunawardana', 'Quality Assurance', 'Automation QA Engineer', '2023-08-28', ACTIVE, 'Full-time', 'Remote', 'EMP-0017'],
  ['Erandi', 'Wijekoon', 'Finance', 'Finance Associate', -11, PROBATION, 'Full-time', 'Colombo HQ', 'EMP-0025'],
]

const GENDERS = ['Female', 'Male']
const MARITAL_STATUSES = ['Single', 'Married']
const CITIES = ['Colombo', 'Dehiwala', 'Kandy', 'Negombo', 'Moratuwa', 'Gampaha']
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling']
const STREETS = ['Temple', 'Galle', 'Station', 'Lake', 'Park']
const GUARDIAN_NAMES = ['Nimal', 'Kumari', 'Sunil', 'Chandra', 'Priya']

const slug = (value) => value.toLowerCase().replace(/[^a-z]/g, '')

const buildEmployee = (row, index) => {
  const [
    firstName,
    lastName,
    department,
    designation,
    joiningDate,
    status,
    employmentType,
    workLocation,
    reportingManagerId,
  ] = row

  const employeeId = `EMP-${String(index + 1).padStart(4, '0')}`
  const birthYear = 1985 + (index % 15)

  // A numeric seed value means "this many days ago", so recent joiners stay
  // recent whenever the mock data is loaded.
  const resolvedJoiningDate =
    typeof joiningDate === 'number' ? daysFromNow(joiningDate) : joiningDate

  return {
    id: employeeId,
    employeeId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: `${slug(firstName)}.${slug(lastName)}@araworkspace.com`,
    phone: `+94 7${index % 9} ${200 + index} ${4100 + index * 7}`,
    department,
    designation,
    joiningDate: resolvedJoiningDate,
    status,
    employmentType,
    workLocation,
    reportingManagerId,
    reportingManager: null,
    avatarUrl: null,
    personalInformation: {
      dateOfBirth: `${birthYear}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
      gender: GENDERS[index % GENDERS.length],
      maritalStatus: MARITAL_STATUSES[index % MARITAL_STATUSES.length],
      nationality: 'Sri Lankan',
      nationalId: `${birthYear}${String(1200000 + index * 7919)}V`,
      personalEmail: `${slug(firstName)}${slug(lastName)}@gmail.com`,
      addressLine1: `${12 + index} ${STREETS[index % STREETS.length]} Road`,
      addressLine2: index % 3 === 0 ? 'Apartment 4B' : '',
      city: CITIES[index % CITIES.length],
      postalCode: String(10000 + index * 37),
      country: 'Sri Lanka',
      emergencyContact: {
        name: `${GUARDIAN_NAMES[index % GUARDIAN_NAMES.length]} ${lastName}`,
        relationship: RELATIONSHIPS[index % RELATIONSHIPS.length],
        phone: `+94 71 ${300 + index} ${5200 + index * 11}`,
      },
    },
  }
}

const employees = seed.map(buildEmployee)

const nameById = new Map(employees.map((employee) => [employee.id, employee.fullName]))

employees.forEach((employee) => {
  employee.reportingManager = employee.reportingManagerId
    ? (nameById.get(employee.reportingManagerId) ?? null)
    : null
})

export const mockEmployees = employees

const DOCUMENT_TEMPLATES = [
  { name: 'Employment Contract.pdf', category: 'Contract', sizeLabel: '412 KB' },
  { name: 'National ID Copy.pdf', category: 'Identity', sizeLabel: '188 KB' },
  { name: 'Educational Certificates.pdf', category: 'Education', sizeLabel: '1.2 MB' },
  { name: 'Offer Letter.pdf', category: 'Contract', sizeLabel: '96 KB' },
]

export const mockDocuments = employees.flatMap((employee, index) =>
  DOCUMENT_TEMPLATES.slice(0, 3 + (index % 2)).map((template, documentIndex) => ({
    id: `${employee.id}-DOC-${documentIndex + 1}`,
    employeeId: employee.id,
    name: template.name,
    category: template.category,
    uploadedOn: employee.joiningDate,
    sizeLabel: template.sizeLabel,
  })),
)
