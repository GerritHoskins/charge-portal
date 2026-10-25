<script setup lang="ts">
import type { TriageAuditItem } from '~/components/triage/TriageAuditTrail.vue'
import type { TriageFact } from '~/components/triage/TriageFacts.vue'
import type { TicketDetail } from '#shared/contracts/triage'
import {
  REASON_MAX,
  REASON_MIN,
  TAXONOMY_CODES,
  TEXT_MAX,
  errorFromIssueCode,
  validateEdit,
  validateReason,
  type EditDecision,
  type EditableDraft,
  type FieldError,
} from '#shared/contracts/triage-rules'

type DecisionBody = { action: 'approve' } | EditDecision | { action: 'reject'; reason: string }
type FieldKey = 'probableCause' | 'suggestedAction' | 'taxonomyCode' | 'reason'
type Mode = 'none' | 'edit' | 'reject'

const { t } = useI18n()
const fmt = useFormatters()
useHead({ title: () => t('triage.detail.pageTitle') })

const route = useRoute()
const id = String(route.params.id)
const {
  data: response,
  error,
  refresh,
} = await useFetch<{ data: TicketDetail }>(`/api/triage/tickets/${id}`, { key: `triage-ticket-${id}` })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: t('triage.detail.notFound'), fatal: true })
}
const ticket = computed(() => response.value?.data ?? null)

// ---- read-only panels -------------------------------------------------------------------------------
const yesNo = (value: boolean) => (value ? t('triage.yes') : t('triage.no'))
const classText = (code: string) => `${code} · ${t(`triage.taxonomy.${code}`)}`

const faultFacts = computed<TriageFact[]>(() => {
  const fault = ticket.value?.fault
  if (!fault) return []
  return [
    { term: t('triage.fault.station'), value: fault.stationId },
    { term: t('triage.fault.connector'), value: fault.connectorId === 0 ? t('triage.fault.wholeStation') : String(fault.connectorId) },
    { term: t('triage.fault.ocppCode'), value: fault.ocppErrorCode },
    { term: t('triage.fault.vendor'), value: fault.vendorId ?? t('triage.none') },
    { term: t('triage.fault.vendorCode'), value: fault.vendorErrorCode ?? t('triage.none') },
    { term: t('triage.fault.class'), value: classText(fault.taxonomyCode) },
    { term: t('triage.fault.component'), value: t(`triage.component.${fault.component}`) },
    { term: t('triage.fault.severity'), value: t(`triage.severity.${fault.severity}`), severity: fault.severity },
    { term: t('triage.fault.siteVisit'), value: yesNo(fault.requiresSiteVisit) },
    { term: t('triage.fault.source'), value: t(`triage.source.${fault.source}`) },
    { term: t('triage.fault.occurred'), value: fmt.dateTime(fault.occurredAt), datetime: fault.occurredAt },
    { term: t('triage.fault.received'), value: fmt.dateTime(fault.receivedAt), datetime: fault.receivedAt },
  ]
})

const draftFacts = computed<TriageFact[]>(() => {
  const current = ticket.value
  if (!current) return []
  return [
    { term: t('triage.field.probableCause'), value: current.probableCause },
    { term: t('triage.field.suggestedAction'), value: current.suggestedAction },
    { term: t('triage.field.taxonomyCode'), value: classText(current.taxonomyCode) },
    { term: t('triage.field.requiresSiteVisit'), value: yesNo(current.requiresSiteVisit) },
    { term: t('triage.draft.confidence'), value: t('triage.draft.confidenceValue', { percent: Math.round(current.confidence * 100) }) },
    { term: t('triage.draft.provider'), value: current.provider },
  ]
})

const decisionFacts = computed<TriageFact[]>(() => {
  const current = ticket.value
  if (!current) return []
  const facts: TriageFact[] = [{ term: t('triage.decision.state'), value: t(`triage.state.${current.state}`) }]
  if (current.state === 'draft') return facts
  if (current.decidedBy) facts.push({ term: t('triage.decision.decidedBy'), value: current.decidedBy })
  if (current.decidedAt) facts.push({ term: t('triage.decision.decidedAt'), value: fmt.dateTime(current.decidedAt), datetime: current.decidedAt })
  if (current.rejectReason) facts.push({ term: t('triage.decision.reason'), value: current.rejectReason })
  return facts
})

const auditItems = computed<TriageAuditItem[]>(() =>
  (ticket.value?.audit ?? []).map((entry) => {
    const changed = entry.action === 'edited' ? (entry.after.changedFields ?? []) : []
    return {
      id: entry.id,
      datetime: entry.at,
      time: fmt.dateTime(entry.at),
      actor: entry.actor,
      action: t(`triage.audit.action.${entry.action}`),
      changes: changed.length ? t('triage.audit.changed', { fields: changed.map((field) => t(`triage.field.${field}`)).join(', ') }) : undefined,
    }
  }),
)

// ---- decision forms ---------------------------------------------------------------------------------
const mode = ref<Mode>('none')
const form = reactive<EditableDraft>({ probableCause: '', suggestedAction: '', taxonomyCode: 'UNCLASSIFIED', requiresSiteVisit: false })
const reason = ref('')
const errors = ref<Partial<Record<string, FieldError>>>({})
const submitting = ref(false)
const failed = ref(false)
const conflict = ref(false)
const announcement = ref('')

const summaryEl = useTemplateRef<{ focus: () => void }>('summary')
const decisionHeading = useTemplateRef<HTMLElement>('decisionHeading')

// Ids drive the error summary links; the order of the keys is the order of the summary.
const FIELD_IDS: Record<FieldKey, string> = {
  probableCause: 'edit-cause',
  suggestedAction: 'edit-action',
  taxonomyCode: 'edit-class',
  reason: 'reject-reason',
}
const FORM_FIELDS: Record<Exclude<Mode, 'none'>, FieldKey[]> = {
  edit: ['probableCause', 'suggestedAction', 'taxonomyCode'],
  reject: ['reason'],
}
const errorKeys = computed(() => (mode.value === 'none' ? [] : FORM_FIELDS[mode.value].filter((key) => errors.value[key])))

const fieldLabel = (key: FieldKey) => (key === 'reason' ? t('triage.rejectForm.reason') : t(`triage.field.${key}`))
const errorText = (key: FieldKey) => {
  const code = errors.value[key]
  if (!code) return undefined
  const isReason = key === 'reason'
  return t(`triage.error.${code}`, { field: fieldLabel(key), min: isReason ? REASON_MIN : 1, max: isReason ? REASON_MAX : TEXT_MAX })
}

const focusField = (key: FieldKey) => document.getElementById(FIELD_IDS[key])?.focus()
const focusSummary = async () => {
  await nextTick()
  summaryEl.value?.focus()
}
const draftOf = (current: TicketDetail): EditableDraft => ({
  probableCause: current.probableCause,
  suggestedAction: current.suggestedAction,
  taxonomyCode: current.taxonomyCode,
  requiresSiteVisit: current.requiresSiteVisit,
})

const openForm = async (next: Exclude<Mode, 'none'>) => {
  errors.value = {}
  failed.value = false
  conflict.value = false
  if (next === 'edit' && ticket.value) Object.assign(form, draftOf(ticket.value))
  if (next === 'reject') reason.value = ''
  mode.value = next
  await nextTick()
  focusField(next === 'edit' ? 'probableCause' : 'reason')
}

const cancel = async () => {
  const from = mode.value
  mode.value = 'none'
  errors.value = {}
  failed.value = false
  await nextTick()
  document.getElementById(from === 'edit' ? 'edit-trigger' : 'reject-trigger')?.focus()
}

// A 422 names the offending fields (the same rules run in the browser first, so this is the rare case
// of a rule that only the server knows). Anything that maps to no visible field is a general failure.
const ISSUE_FIELDS: Record<string, FieldKey> = {
  probableCause: 'probableCause',
  suggestedAction: 'suggestedAction',
  taxonomyCode: 'taxonomyCode',
  reason: 'reason',
}
interface FetchFailure {
  statusCode?: number
  status?: number
  data?: { data?: { issues?: { path: string; code: string }[] } }
}
const applyIssues = (issues: { path: string; code: string }[]) => {
  const next: Partial<Record<string, FieldError>> = {}
  for (const issue of issues) {
    const key = ISSUE_FIELDS[issue.path] ?? (issue.code === 'no_change' ? 'probableCause' : undefined)
    if (key && FORM_FIELDS[mode.value as Exclude<Mode, 'none'>]?.includes(key)) next[key] = errorFromIssueCode(issue.code)
  }
  errors.value = next
  return Object.keys(next).length > 0
}

const handleFailure = async (e: unknown) => {
  const failure = e as FetchFailure
  const status = failure.statusCode ?? failure.status
  if (status === 409) {
    // Someone else decided first: show the current (read-only) state.
    conflict.value = true
    mode.value = 'none'
    await refresh()
  } else if (!(status === 422 && applyIssues(failure.data?.data?.issues ?? []))) {
    failed.value = true
  }
  await focusSummary()
}

const decide = async (body: DecisionBody) => {
  failed.value = false
  conflict.value = false
  submitting.value = true
  try {
    const res = await $fetch<{ data: TicketDetail }>(`/api/triage/tickets/${id}/decision`, { method: 'POST', body })
    response.value = res
    errors.value = {}
    mode.value = 'none'
    announcement.value = t(`triage.decision.done.${res.data.state}`)
    await nextTick()
    // The buttons are gone: move focus to the decision heading, which now shows the outcome.
    decisionHeading.value?.focus()
  } catch (e) {
    await handleFailure(e)
  } finally {
    submitting.value = false
  }
}

const submitEdit = async () => {
  if (!ticket.value) return
  const checked = validateEdit(draftOf(ticket.value), form)
  if (!checked.value) {
    errors.value = checked.fields
    return focusSummary()
  }
  errors.value = {}
  await decide(checked.value)
}

const submitReject = async () => {
  const checked = validateReason(reason.value)
  if (checked.value === undefined) {
    errors.value = checked.fields
    return focusSummary()
  }
  errors.value = {}
  await decide({ action: 'reject', reason: checked.value })
}
</script>

<template>
  <section v-if="ticket" aria-labelledby="review-heading">
    <p><NuxtLink to="/portal/triage">{{ t('triage.detail.back') }}</NuxtLink></p>
    <h1 id="review-heading">{{ t('triage.detail.heading', { station: ticket.stationId }) }}</h1>

    <!-- Polite live region: the outcome of a decision is announced without moving the reader. -->
    <p class="sr-only" role="status">{{ announcement }}</p>

    <section class="panel" aria-labelledby="fault-heading">
      <h2 id="fault-heading">{{ t('triage.fault.heading') }}</h2>
      <TriageFacts :items="faultFacts" />
    </section>

    <section class="panel" aria-labelledby="draft-heading">
      <h2 id="draft-heading">{{ t('triage.draft.heading') }}</h2>
      <TriageFacts :items="draftFacts" />
    </section>

    <section class="panel" aria-labelledby="decision-heading">
      <h2 id="decision-heading" ref="decisionHeading" tabindex="-1">{{ t('triage.decision.heading') }}</h2>

      <!-- Error summary: focused after a failed submit, links to each invalid field. -->
      <DsAlert v-if="errorKeys.length || failed || conflict" ref="summary">
        <p v-if="conflict">{{ t('triage.decision.alreadyDecided') }}</p>
        <p v-else-if="failed">{{ t('triage.decision.failed') }}</p>
        <template v-else>
          <h2>{{ errorKeys.length === 1 ? t('triage.decision.fixOne') : t('triage.decision.fixMany', { n: errorKeys.length }) }}</h2>
          <ul>
            <li v-for="key in errorKeys" :key="key">
              <a :href="`#${FIELD_IDS[key]}`" @click.prevent="focusField(key)">{{ errorText(key) }}</a>
            </li>
          </ul>
        </template>
      </DsAlert>

      <TriageFacts :items="decisionFacts" />

      <template v-if="ticket.state === 'draft'">
        <template v-if="mode === 'none'">
          <p>{{ t('triage.decision.intro') }}</p>
          <div class="actions">
            <DsButton :disabled="submitting" @click="decide({ action: 'approve' })">{{ t('triage.decision.approve') }}</DsButton>
            <DsButton id="edit-trigger" variant="secondary" :disabled="submitting" @click="openForm('edit')">{{ t('triage.decision.edit') }}</DsButton>
            <DsButton id="reject-trigger" variant="secondary" :disabled="submitting" @click="openForm('reject')">{{ t('triage.decision.reject') }}</DsButton>
          </div>
        </template>

        <!-- novalidate: validation is ours, so messages are consistent and accessible (ADR 0003). -->
        <form v-else-if="mode === 'edit'" novalidate aria-labelledby="edit-heading" @submit.prevent="submitEdit">
          <h3 id="edit-heading">{{ t('triage.editForm.heading') }}</h3>
          <p>{{ t('triage.editForm.hint') }}</p>

          <DsTextField
            id="edit-cause"
            v-model="form.probableCause"
            multiline
            required
            :label="t('triage.field.probableCause')"
            :required-text="t('common.required')"
            :hint="t('triage.editForm.textHint', { max: TEXT_MAX })"
            :error="errorText('probableCause')"
            :error-prefix="t('common.errorPrefix')"
          />
          <DsTextField
            id="edit-action"
            v-model="form.suggestedAction"
            multiline
            required
            :label="t('triage.field.suggestedAction')"
            :required-text="t('common.required')"
            :hint="t('triage.editForm.textHint', { max: TEXT_MAX })"
            :error="errorText('suggestedAction')"
            :error-prefix="t('common.errorPrefix')"
          />

          <div class="field">
            <label for="edit-class">{{ t('triage.field.taxonomyCode') }}</label>
            <p v-if="errors.taxonomyCode" id="edit-class-error" class="field-error">
              <span class="sr-only">{{ t('common.errorPrefix') }}</span>{{ errorText('taxonomyCode') }}
            </p>
            <select
              id="edit-class"
              v-model="form.taxonomyCode"
              :aria-invalid="errors.taxonomyCode ? 'true' : undefined"
              :aria-describedby="errors.taxonomyCode ? 'edit-class-error' : undefined"
            >
              <option v-for="code in TAXONOMY_CODES" :key="code" :value="code">{{ classText(code) }}</option>
            </select>
          </div>

          <div class="check">
            <input id="edit-visit" v-model="form.requiresSiteVisit" type="checkbox" />
            <label for="edit-visit">{{ t('triage.field.requiresSiteVisit') }}</label>
          </div>

          <div class="actions">
            <DsButton type="submit" :disabled="submitting">{{ submitting ? t('triage.decision.submitting') : t('triage.editForm.submit') }}</DsButton>
            <DsButton variant="secondary" :disabled="submitting" @click="cancel">{{ t('triage.decision.cancel') }}</DsButton>
          </div>
        </form>

        <form v-else novalidate aria-labelledby="reject-heading" @submit.prevent="submitReject">
          <h3 id="reject-heading">{{ t('triage.rejectForm.heading') }}</h3>
          <DsTextField
            id="reject-reason"
            v-model="reason"
            multiline
            required
            :label="t('triage.rejectForm.reason')"
            :required-text="t('common.required')"
            :hint="t('triage.rejectForm.hint', { min: REASON_MIN, max: REASON_MAX })"
            :error="errorText('reason')"
            :error-prefix="t('common.errorPrefix')"
          />
          <div class="actions">
            <DsButton type="submit" :disabled="submitting">{{ submitting ? t('triage.decision.submitting') : t('triage.rejectForm.submit') }}</DsButton>
            <DsButton variant="secondary" :disabled="submitting" @click="cancel">{{ t('triage.decision.cancel') }}</DsButton>
          </div>
        </form>
      </template>
    </section>

    <section class="panel" aria-labelledby="audit-heading">
      <h2 id="audit-heading">{{ t('triage.audit.heading') }}</h2>
      <TriageAuditTrail v-if="auditItems.length" :entries="auditItems" />
      <p v-else>{{ t('triage.audit.empty') }}</p>
    </section>
  </section>

  <section v-else aria-labelledby="review-error-heading">
    <h1 id="review-error-heading">{{ t('triage.detail.pageTitle') }}</h1>
    <DsAlert><p>{{ t('triage.detail.loadError') }}</p></DsAlert>
    <p><NuxtLink to="/portal/triage">{{ t('triage.detail.back') }}</NuxtLink></p>
  </section>
</template>

<style scoped>
.panel { max-width: var(--bp-lg); margin-bottom: var(--space-4); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-3); }
form { max-width: var(--bp-md); margin-top: var(--space-3); }
.field { margin-bottom: var(--space-4); }
.field label { display: block; font-weight: 600; }
.field-error { margin: 0 0 var(--space-1); color: var(--color-error); font-weight: 600; }
select { width: 100%; min-height: var(--control-min-height); font: inherit; padding: var(--space-2); border: 2px solid var(--color-border); border-radius: var(--radius); }
select[aria-invalid='true'] { border-color: var(--color-error); }
.check { display: flex; gap: var(--space-2); align-items: center; min-height: var(--control-min-height); margin-bottom: var(--space-3); }
.check input { width: 1.25rem; height: 1.25rem; }
</style>
