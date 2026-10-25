// Operator input rules for the triage screens, without any dependency, so the browser bundle does not
// ship zod (or the taxonomy package) just to validate two small forms. `ticketDecisionInputSchema` in
// triage.ts stays the authority in the BFF and in the service; a unit test checks both agree (like
// dispute-rules.ts). Errors are codes, not sentences: the page translates them (`triage.error.<code>`).

export const REASON_MIN = 3
export const REASON_MAX = 500
export const TEXT_MAX = 2000

export const EDIT_FIELDS = ['probableCause', 'suggestedAction', 'taxonomyCode', 'requiresSiteVisit'] as const
export type EditField = (typeof EDIT_FIELDS)[number]

// Copy of the TAXONOMY keys (packages/fault-taxonomy); a unit test fails when the two differ.
export const TAXONOMY_CODES = [
  'CON.LOCK_FAILURE',
  'CON.CABLE_DAMAGE',
  'PWR.OVERCURRENT',
  'PWR.MODULE_FAILURE',
  'PWR.OVERVOLTAGE',
  'PWR.UNDERVOLTAGE',
  'GRD.GROUND_FAULT',
  'MTR.METER_FAILURE',
  'COM.EV_HANDSHAKE',
  'COM.BACKEND_LINK',
  'COM.WEAK_SIGNAL',
  'RFD.READER_FAILURE',
  'FWR.RESET_FAILURE',
  'FWR.CRASH',
  'THM.OVER_TEMPERATURE',
  'THM.FAN_FAILURE',
  'UNCLASSIFIED',
] as const

export const FIELD_ERRORS = ['required', 'tooShort', 'tooLong', 'noChange', 'unknownClass', 'invalid'] as const
export type FieldError = (typeof FIELD_ERRORS)[number]

export interface Validation<T> {
  value?: T
  fields: Partial<Record<string, FieldError>>
}

/** What the page edits: the fields an operator may change, as they appear on the draft. */
export interface EditableDraft {
  probableCause: string
  suggestedAction: string
  taxonomyCode: string
  requiresSiteVisit: boolean
}

export type EditChanges = Partial<EditableDraft>
export type EditDecision = EditChanges & { action: 'edit' }

export const validateReason = (input: unknown): Validation<string> => {
  const reason = typeof input === 'string' ? input.trim() : ''
  if (reason.length === 0) return { fields: { reason: 'required' } }
  if (reason.length < REASON_MIN) return { fields: { reason: 'tooShort' } }
  if (reason.length > REASON_MAX) return { fields: { reason: 'tooLong' } }
  return { value: reason, fields: {} }
}

/** The fields whose (trimmed) value differs from the draft; this is what the BFF receives. */
export const buildEdit = (draft: EditableDraft, form: EditableDraft): EditChanges => {
  const changes: EditChanges = {}
  const probableCause = form.probableCause.trim()
  const suggestedAction = form.suggestedAction.trim()
  if (probableCause !== draft.probableCause) changes.probableCause = probableCause
  if (suggestedAction !== draft.suggestedAction) changes.suggestedAction = suggestedAction
  if (form.taxonomyCode !== draft.taxonomyCode) changes.taxonomyCode = form.taxonomyCode
  if (form.requiresSiteVisit !== draft.requiresSiteVisit) changes.requiresSiteVisit = form.requiresSiteVisit
  return changes
}

const textError = (text: string): FieldError | undefined => {
  const length = text.trim().length
  if (length === 0) return 'required'
  return length > TEXT_MAX ? 'tooLong' : undefined
}

export const validateEdit = (draft: EditableDraft, form: EditableDraft): Validation<EditDecision> => {
  const fields: Validation<EditDecision>['fields'] = {}
  const causeError = textError(form.probableCause)
  const actionError = textError(form.suggestedAction)
  if (causeError) fields.probableCause = causeError
  if (actionError) fields.suggestedAction = actionError
  if (!(TAXONOMY_CODES as readonly string[]).includes(form.taxonomyCode)) fields.taxonomyCode = 'unknownClass'
  if (Object.keys(fields).length > 0) return { fields }

  const changes = buildEdit(draft, form)
  if (Object.keys(changes).length === 0) return { fields: { probableCause: 'noChange' } }
  return { value: { action: 'edit', ...changes }, fields }
}

/** Maps an issue code of a 422 (zod code, or the service's `no_change`) to a translatable error. */
export const errorFromIssueCode = (code: string): FieldError => {
  if (code === 'too_small') return 'tooShort'
  if (code === 'too_big') return 'tooLong'
  if (code === 'no_change') return 'noChange'
  if (code === 'invalid_value') return 'unknownClass'
  return 'invalid'
}
