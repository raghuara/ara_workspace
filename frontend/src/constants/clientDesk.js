export const TICKET_KINDS = [
  { value: 'Complaint', label: 'Complaint', tone: 'rose', hint: 'Something went wrong for the client' },
  { value: 'Requirement', label: 'Requirement', tone: 'blue', hint: 'New work the client needs' },
  { value: 'Change', label: 'Change', tone: 'amber', hint: 'A change to work already delivered' },
  { value: 'New request', label: 'New request', tone: 'violet', hint: 'A fresh ask, not yet scoped' },
  { value: 'Other', label: 'Other', tone: 'slate', hint: 'Anything else worth recording' },
]

export const TICKET_STATUSES = [
  { value: 'New', label: 'New', tone: 'blue', open: true, hint: 'Raised, not started yet' },
  { value: 'In progress', label: 'In progress', tone: 'violet', open: true, hint: 'Being worked on now' },
  { value: 'With client', label: 'With client', tone: 'amber', open: true, hint: 'Done and shown to the client to check' },
  { value: 'Reopened', label: 'Reopened', tone: 'orange', open: true, hint: 'The client asked for more changes' },
  { value: 'Completed', label: 'Completed', tone: 'green', open: false, hint: 'The client is happy — ticket closed' },
]

export const OPEN_STATUSES = TICKET_STATUSES.filter((status) => status.open).map((status) => status.value)

export const statusOf = (value) => TICKET_STATUSES.find((status) => status.value === value) ?? TICKET_STATUSES[0]

export const kindOf = (value) => TICKET_KINDS.find((kind) => kind.value === value) ?? TICKET_KINDS[4]

/**
 * The round trip with the client: work it, show it, and if they want more
 * changes it comes back on the same token so the rounds stay countable.
 */
export const NEXT_STATUSES = {
  New: ['In progress', 'With client'],
  'In progress': ['With client', 'Completed'],
  'With client': ['Reopened', 'Completed', 'In progress'],
  Reopened: ['In progress', 'With client'],
  Completed: ['Reopened'],
}

export const STATUS_ACTIONS = {
  'In progress': { label: 'Start work', primary: false },
  'With client': { label: 'Show the client', primary: false },
  Completed: { label: 'Mark completed', primary: true },
  Reopened: { label: 'Client asked changes', primary: true },
  New: { label: 'Back to queue', primary: false },
}

export const roundLabel = (reopenCount = 0) =>
  reopenCount === 0 ? 'First round' : `Round ${reopenCount + 1}`
