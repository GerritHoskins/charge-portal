import { z } from 'zod'
import { ocppErrorCodeSchema } from '@charge-portal/fault-taxonomy/ocpp'
import { componentSchema, severitySchema, TAXONOMY, taxonomyCodeSchema } from '@charge-portal/fault-taxonomy/taxonomy'

// The contract between the Vue frontend and the triage service (ADR 0009). The BFF parses every
// GraphQL `data` object with these schemas, so drift fails loudly at the boundary (502) instead of
// deep inside a component. Component, severity, source and action are plain strings on the GraphQL
// wire (some values contain hyphens); they are constrained to the known values here.

export const ticketStateSchema = z.enum(['draft', 'approved', 'edited', 'rejected'])
export const faultSourceSchema = z.enum(['vendor-table', 'ocpp-default', 'unclassified'])
export const auditActionSchema = z.enum(['draft-created', 'approved', 'edited', 'rejected'])
// The fields an operator can change; `changedFields` in an edit's audit entry lists a subset.
export const editableFieldSchema = z.enum(['probableCause', 'suggestedAction', 'taxonomyCode', 'requiresSiteVisit'])

const timestampSchema = z.iso.datetime()
const idSchema = z.guid()

/** A canonical class (ADR 0008): what the fault means, independent of the vendor. */
export const faultClassSummarySchema = z.object({
  taxonomyCode: taxonomyCodeSchema,
  component: componentSchema,
  severity: severitySchema,
  requiresSiteVisit: z.boolean(),
})

/** The fault a ticket was drafted for: raw codes as reported plus the normalised class. The raw payload stays server-side. */
export const faultDetailSchema = faultClassSummarySchema.extend({
  id: idSchema,
  stationId: z.string().min(1),
  connectorId: z.number().int().nonnegative(),
  ocppErrorCode: ocppErrorCodeSchema,
  vendorId: z.string().nullable(),
  vendorErrorCode: z.string().nullable(),
  source: faultSourceSchema,
  occurredAt: timestampSchema,
  receivedAt: timestampSchema,
})

// Ticket snapshots in audit entries: the keys are the service's business, `changedFields` is the one we read.
const auditSnapshotSchema = z.looseObject({ changedFields: z.array(editableFieldSchema).optional() })

export const auditEntrySchema = z.object({
  id: idSchema,
  ticketId: idSchema,
  action: auditActionSchema,
  actor: z.string().min(1),
  before: auditSnapshotSchema.nullable(),
  after: auditSnapshotSchema,
  at: timestampSchema,
})

export const ticketSummarySchema = z.object({
  id: idSchema,
  faultId: idSchema,
  stationId: z.string().min(1),
  state: ticketStateSchema,
  taxonomyCode: taxonomyCodeSchema,
  probableCause: z.string(),
  suggestedAction: z.string(),
  requiresSiteVisit: z.boolean(),
  confidence: z.number().min(0).max(1),
  provider: z.string().min(1),
  rejectReason: z.string().nullable(),
  createdAt: timestampSchema,
  decidedAt: timestampSchema.nullable(),
  decidedBy: z.string().nullable(),
  // The normalised class of the fault. The ticket's own taxonomyCode may differ after an edit.
  fault: faultClassSummarySchema,
})

export const ticketDetailSchema = ticketSummarySchema.extend({
  fault: faultDetailSchema,
  audit: z.array(auditEntrySchema),
})

export const ticketListResponseSchema = z.object({ data: z.array(ticketSummarySchema) })
export const ticketDetailResponseSchema = z.object({ data: ticketDetailSchema })

// What the service answers (GraphQL `data`), before the BFF wraps it in `{ data }`.
export const ticketsQueryDataSchema = z.object({ tickets: z.array(ticketSummarySchema) })
export const ticketQueryDataSchema = z.object({ ticket: ticketDetailSchema.nullable() })

export type TicketDecisionMutation = 'approveTicket' | 'editTicket' | 'rejectTicket'
export const mutationTicketDataSchema = <N extends TicketDecisionMutation>(name: N) =>
  z.object({ [name]: ticketDetailSchema } as Record<N, typeof ticketDetailSchema>)

// The operator's decision. The actor is deliberately absent: it comes from the session, and an
// unknown key (such as `actor`) is a validation error.
const knownTaxonomyCodeSchema = z.string().refine((code) => Object.hasOwn(TAXONOMY, code), 'Unknown taxonomy code')
const editTextSchema = z.string().trim().min(1).max(2000)

export const ticketEditFieldsSchema = z.strictObject({
  probableCause: editTextSchema.optional(),
  suggestedAction: editTextSchema.optional(),
  taxonomyCode: knownTaxonomyCodeSchema.optional(),
  requiresSiteVisit: z.boolean().optional(),
})

export const ticketDecisionInputSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve') }),
  z
    .strictObject({ action: z.literal('edit'), ...ticketEditFieldsSchema.shape })
    .refine((edit) => editableFieldSchema.options.some((field) => edit[field] !== undefined), {
      message: 'Change at least one field',
      path: ['probableCause'],
    }),
  z.strictObject({ action: z.literal('reject'), reason: z.string().trim().min(3).max(500) }),
])

export const ticketsQuerySchema = z.object({ state: ticketStateSchema.optional() })

// Station state (WP-08/09): the live health of a station and its active alerts. The wire spelling of
// the state is `needs_visit` (a GraphQL enum value cannot contain a hyphen); the contract, the BFF
// response and the UI use `needs-visit`, like the rest of the taxonomy.
export const stationHealthSchema = z.enum(['ok', 'degraded', 'needs-visit', 'offline'])
// Why an alert is raised. The UI translates by kind: the service's English message is never requested.
export const stationAlertKindSchema = z.enum([
  'site_visit_fault',
  'recurring_fault',
  'sustained_overheating',
  'degraded_fault',
  'high_temperature',
  'offline',
])

export const stationAlertSchema = z.object({
  id: idSchema,
  stationId: z.string().min(1),
  kind: stationAlertKindSchema,
  raisedAt: timestampSchema,
})

export const stationStateSchema = z.object({
  stationId: z.string().min(1),
  state: stationHealthSchema,
  /** When the station took its last reading (its own clock). */
  updatedAt: timestampSchema,
  /** Active alerts only. */
  alerts: z.array(stationAlertSchema),
})

export const stationStateListResponseSchema = z.object({ data: z.array(stationStateSchema) })

const wireHealthSchema = z.enum(['ok', 'degraded', 'needs_visit', 'offline'])

// What the service answers (GraphQL `data`): parsed and mapped to the contract in one step, so the
// wire spelling cannot leak past the BFF. Fields the UI does not use are dropped here.
export const stationStatesQueryDataSchema = z.object({
  stationStates: z.array(
    z
      .object({
        stationId: z.string().min(1),
        state: wireHealthSchema,
        lastSampleAt: timestampSchema,
        alerts: z.array(stationAlertSchema),
      })
      .transform(({ lastSampleAt, state, ...rest }) => ({
        ...rest,
        state: state === 'needs_visit' ? ('needs-visit' as const) : state,
        updatedAt: lastSampleAt,
      })),
  ),
})

export type TicketState = z.infer<typeof ticketStateSchema>
export type FaultClassSummary = z.infer<typeof faultClassSummarySchema>
export type FaultDetail = z.infer<typeof faultDetailSchema>
export type AuditEntry = z.infer<typeof auditEntrySchema>
export type TicketSummary = z.infer<typeof ticketSummarySchema>
export type TicketDetail = z.infer<typeof ticketDetailSchema>
export type TicketDecisionInput = z.infer<typeof ticketDecisionInputSchema>
export type StationHealth = z.infer<typeof stationHealthSchema>
export type StationAlertKind = z.infer<typeof stationAlertKindSchema>
export type StationAlert = z.infer<typeof stationAlertSchema>
export type StationState = z.infer<typeof stationStateSchema>

// Body of a 422 from the BFF: the same shape whether the BFF or the service found the problem.
// `path` is dotted (`reason`, `probableCause`); empty when the issue concerns the whole input.
export const triageValidationIssueSchema = z.object({ path: z.string(), message: z.string(), code: z.string() })
export const triageValidationErrorSchema = z.object({
  error: z.literal('validation'),
  issues: z.array(triageValidationIssueSchema),
})

export type TriageValidationIssue = z.infer<typeof triageValidationIssueSchema>
export type TriageValidationError = z.infer<typeof triageValidationErrorSchema>

export const toValidationError = (error: z.ZodError): TriageValidationError => ({
  error: 'validation',
  issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message, code: issue.code })),
})
