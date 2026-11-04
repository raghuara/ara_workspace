export const TICKET_KINDS = [
  {
    value: 'Complaint',
    label: 'Feedback',
    tone: 'rose',
    hint: 'A suggestion or an issue the client raised about our work',
    pick: 'The client told us something',
    pickHint: 'An issue, a suggestion, anything they said about our work. Saved in their own words.',
    titleLabel: 'In one line, what is it about?',
    titlePlaceholder: 'Logo colour wrong on the new banner',
    detailLabel: "What the client said, in their words",
    detailPlaceholder: 'Write it the way they said it, so anyone reading this later understands the client.',
    dueLabel: 'Sort it out by',
    action: 'Save feedback',
  },
  {
    value: 'Requirement',
    label: 'Requirement',
    tone: 'blue',
    hint: 'New work the client needs',
    pick: 'The client needs new work',
    pickHint: 'Something to produce and deliver. Tracked until they are happy with it.',
    titleLabel: 'What does the client need?',
    titlePlaceholder: 'Diwali reel for Instagram',
    detailLabel: 'What exactly they asked for',
    detailPlaceholder: 'Scope, references, sizes, anything they shared…',
    dueLabel: 'Deliver by',
    action: 'Raise requirement',
  },
  {
    value: 'Change',
    label: 'Change',
    tone: 'amber',
    hint: 'A change to work already delivered',
    pick: 'Changes to work we delivered',
    pickHint: 'They saw it and want it different. For work already on the desk, send that ticket back instead.',
    titleLabel: 'What needs changing?',
    titlePlaceholder: 'Swap the background music on the reel',
    detailLabel: 'What they want changed',
    detailPlaceholder: 'Which part, and what they want instead…',
    dueLabel: 'Change it by',
    action: 'Raise change',
  },
  {
    value: 'New request',
    label: 'New request',
    tone: 'violet',
    hint: 'A fresh ask, not yet scoped',
    pick: 'A fresh ask, not yet scoped',
    pickHint: 'They have asked for something, but what it takes is not clear yet.',
    titleLabel: 'What did they ask for?',
    titlePlaceholder: 'Something for the new store opening',
    detailLabel: 'What they said so far',
    detailPlaceholder: 'Whatever they told you — it can be scoped later.',
    dueLabel: 'Come back to them by',
    action: 'Save request',
  },
  {
    value: 'Other',
    label: 'Other',
    tone: 'slate',
    hint: 'Anything else worth recording',
    pick: 'Something else worth recording',
    pickHint: 'Anything from the client that does not fit the rest.',
    titleLabel: 'In one line, what is it?',
    titlePlaceholder: 'Client changed their billing contact',
    detailLabel: 'Details',
    detailPlaceholder: 'Anything worth keeping on record.',
    dueLabel: 'Deal with it by',
    action: 'Save it',
  },
]

export const FEEDBACK_KIND = 'Complaint'

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

export const changeRounds = (reopenCount = 0) =>
  reopenCount === 0
    ? 'No changes asked yet'
    : `Came back ${reopenCount} ${reopenCount === 1 ? 'time' : 'times'} for changes`
