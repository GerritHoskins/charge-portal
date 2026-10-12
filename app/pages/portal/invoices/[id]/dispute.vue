<script setup lang="ts">
import {
  DISPUTE_MESSAGE_MAX,
  disputeInputSchema,
  type DisputeReason,
  type Invoice,
} from '#shared/contracts/invoice'

useHead({ title: 'Rechnung beanstanden' })

const route = useRoute()
const id = String(route.params.id)
const { data: invoices } = await useFetch<Invoice[]>('/api/invoices', { default: () => [] })
const invoice = computed(() => invoices.value.find((i) => i.id === id))

if (!invoice.value || invoice.value.status !== 'open') {
  throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden oder nicht beanstandbar', fatal: true })
}

const reasons: { value: DisputeReason; label: string }[] = [
  { value: 'wrong-amount', label: 'Der Betrag ist falsch' },
  { value: 'not-my-session', label: 'Ein Ladevorgang stammt nicht von mir' },
  { value: 'duplicate', label: 'Die Rechnung wurde doppelt gestellt' },
  { value: 'other', label: 'Anderer Grund' },
]

const reason = ref<DisputeReason | ''>('')
const message = ref('')
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const failed = ref(false)
const done = ref(false)

const summaryEl = useTemplateRef<HTMLElement>('summary')
const doneEl = useTemplateRef<HTMLElement>('doneHeading')

// Field order drives the summary order. The first radio carries the group's anchor id.
const fieldIds = { reason: 'reason-first', message: 'message' } as const
type FieldKey = keyof typeof fieldIds
const errorList = computed(() => (Object.keys(fieldIds) as FieldKey[]).filter((k) => errors.value[k]))

const focusField = (key: FieldKey) => document.getElementById(fieldIds[key])?.focus()

const focusSummary = async () => {
  await nextTick()
  summaryEl.value?.focus()
}

const submit = async () => {
  failed.value = false
  const parsed = disputeInputSchema.safeParse({ reason: reason.value, message: message.value })
  if (!parsed.success) {
    errors.value = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))
    // zod's enum message is English; the reason field gets a German one.
    if (errors.value.reason) errors.value.reason = 'Bitte wählen Sie einen Grund.'
    return focusSummary()
  }
  errors.value = {}
  submitting.value = true
  try {
    await $fetch(`/api/invoices/${id}/disputes`, { method: 'POST', body: parsed.data })
    done.value = true
    await nextTick()
    doneEl.value?.focus()
  } catch (e) {
    const fields = (e as { data?: { data?: { fields?: Record<string, string> } } }).data?.data?.fields
    if (fields) errors.value = fields
    else failed.value = true
    await focusSummary()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section v-if="done" aria-labelledby="done-heading">
    <h1 id="done-heading" ref="doneHeading" tabindex="-1">Beanstandung eingegangen</h1>
    <p role="status">Wir prüfen Rechnung {{ invoice?.number }} und melden uns bei Ihnen.</p>
    <p><NuxtLink to="/portal/invoices">Zurück zu den Rechnungen</NuxtLink></p>
  </section>

  <section v-else aria-labelledby="dispute-heading">
    <h1 id="dispute-heading">Rechnung {{ invoice?.number }} beanstanden</h1>

    <!-- Error summary: focused after a failed submit, links to each invalid field. -->
    <div v-if="errorList.length || failed" ref="summary" class="error-summary" role="alert" tabindex="-1">
      <p v-if="failed">Die Beanstandung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.</p>
      <template v-else>
        <h2>Bitte korrigieren Sie {{ errorList.length === 1 ? 'ein Feld' : `${errorList.length} Felder` }}</h2>
        <ul>
          <li v-for="key in errorList" :key="key">
            <a :href="`#${fieldIds[key]}`" @click.prevent="focusField(key)">{{ errors[key] }}</a>
          </li>
        </ul>
      </template>
    </div>

    <!-- novalidate: validation is ours, so messages are consistent and accessible. -->
    <form novalidate @submit.prevent="submit">
      <fieldset :aria-describedby="errors.reason ? 'reason-error' : undefined">
        <legend>Grund der Beanstandung <span class="req">(Pflichtfeld)</span></legend>
        <p v-if="errors.reason" id="reason-error" class="field-error"><span class="sr-only">Fehler: </span>{{ errors.reason }}</p>
        <div v-for="(r, i) in reasons" :key="r.value" class="radio">
          <input :id="i === 0 ? 'reason-first' : `reason-${r.value}`" v-model="reason" type="radio" name="reason" :value="r.value" />
          <label :for="i === 0 ? 'reason-first' : `reason-${r.value}`">{{ r.label }}</label>
        </div>
      </fieldset>

      <div class="field">
        <label for="message">Beschreibung <span class="req">(Pflichtfeld)</span></label>
        <p id="message-hint" class="hint">Mindestens 10, höchstens {{ DISPUTE_MESSAGE_MAX }} Zeichen. Bitte keine Zahlungsdaten angeben.</p>
        <p v-if="errors.message" id="message-error" class="field-error"><span class="sr-only">Fehler: </span>{{ errors.message }}</p>
        <textarea
          id="message"
          v-model="message"
          rows="5"
          required
          :aria-invalid="errors.message ? 'true' : undefined"
          :aria-describedby="errors.message ? 'message-hint message-error' : 'message-hint'"
        />
      </div>

      <button type="submit" :disabled="submitting">{{ submitting ? 'Wird gesendet …' : 'Beanstandung senden' }}</button>
      <NuxtLink class="cancel" to="/portal/invoices">Abbrechen</NuxtLink>
    </form>
  </section>
</template>

<style scoped>
form { max-width: 40rem; }
fieldset { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-3); margin: 0 0 var(--space-4); }
legend { font-weight: 600; padding: 0 var(--space-1); }
.req { font-weight: 400; color: var(--color-text-muted); }
.radio { display: flex; gap: var(--space-2); align-items: center; padding: var(--space-1) 0; }
.radio input { width: 1.25rem; height: 1.25rem; }
.field { margin-bottom: var(--space-4); }
.field label { display: block; font-weight: 600; }
.hint { margin: 0 0 var(--space-1); color: var(--color-text-muted); }
textarea { width: 100%; font: inherit; padding: var(--space-2); border: 2px solid var(--color-border); border-radius: var(--radius); }
textarea[aria-invalid='true'] { border-color: var(--color-error); }
.field-error { margin: 0 0 var(--space-1); color: var(--color-error); font-weight: 600; }
.error-summary { border: 2px solid var(--color-error); border-radius: var(--radius); padding: var(--space-3); margin-bottom: var(--space-4); max-width: 40rem; }
.error-summary h2 { margin: 0 0 var(--space-2); font-size: 1.125rem; color: var(--color-error); }
.error-summary ul { margin: 0; padding-left: var(--space-4); }
button { font: inherit; padding: var(--space-2) var(--space-4); background: var(--color-brand); color: var(--color-brand-contrast); border: 0; border-radius: var(--radius); cursor: pointer; }
button:disabled { opacity: 0.7; cursor: progress; }
.cancel { margin-left: var(--space-3); }
</style>
