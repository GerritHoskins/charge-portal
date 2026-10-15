<script setup lang="ts">
import { DISPUTE_MESSAGE_MAX, DISPUTE_REASONS, type DisputeReason, validateDispute } from '#shared/contracts/dispute-rules'
import type { Invoice } from '#shared/contracts/invoice'

const { t } = useI18n()
useHead({ title: () => t('dispute.pageTitle') })

const route = useRoute()
const id = String(route.params.id)
const { data: invoices } = await useFetch<Invoice[]>('/api/invoices', { default: () => [] })
const invoice = computed(() => invoices.value.find((i) => i.id === id))

if (!invoice.value || invoice.value.status !== 'open') {
  throw createError({ statusCode: 404, statusMessage: t('dispute.notFound'), fatal: true })
}

const reason = ref<DisputeReason | ''>('')
const message = ref('')
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const failed = ref(false)
const done = ref(false)

const summaryEl = useTemplateRef<{ focus: () => void }>('summary')
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
  const checked = validateDispute({ reason: reason.value, message: message.value })
  if (!checked.value) {
    errors.value = checked.fields
    return focusSummary()
  }
  errors.value = {}
  submitting.value = true
  try {
    await $fetch(`/api/invoices/${id}/disputes`, { method: 'POST', body: checked.value })
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
    <h1 id="done-heading" ref="doneHeading" tabindex="-1">{{ t('dispute.doneTitle') }}</h1>
    <p role="status">{{ t('dispute.doneText', { number: invoice?.number }) }}</p>
    <p><NuxtLink to="/portal/invoices">{{ t('dispute.back') }}</NuxtLink></p>
  </section>

  <section v-else aria-labelledby="dispute-heading">
    <h1 id="dispute-heading">{{ t('dispute.heading', { number: invoice?.number }) }}</h1>

    <!-- Error summary: focused after a failed submit, links to each invalid field. -->
    <DsAlert v-if="errorList.length || failed" ref="summary">
      <p v-if="failed">{{ t('dispute.failed') }}</p>
      <template v-else>
        <h2>{{ errorList.length === 1 ? t('dispute.fixOne') : t('dispute.fixMany', { n: errorList.length }) }}</h2>
        <ul>
          <li v-for="key in errorList" :key="key">
            <a :href="`#${fieldIds[key]}`" @click.prevent="focusField(key)">{{ errors[key] }}</a>
          </li>
        </ul>
      </template>
    </DsAlert>

    <!-- novalidate: validation is ours, so messages are consistent and accessible. -->
    <form novalidate @submit.prevent="submit">
      <fieldset :aria-describedby="errors.reason ? 'reason-error' : undefined">
        <legend>{{ t('dispute.reasonLegend') }} <span class="req">{{ t('common.required') }}</span></legend>
        <p v-if="errors.reason" id="reason-error" class="field-error"><span class="sr-only">{{ t('common.errorPrefix') }}</span>{{ errors.reason }}</p>
        <div v-for="(r, i) in DISPUTE_REASONS" :key="r" class="radio">
          <input :id="i === 0 ? 'reason-first' : `reason-${r}`" v-model="reason" type="radio" name="reason" :value="r" />
          <label :for="i === 0 ? 'reason-first' : `reason-${r}`">{{ t(`dispute.reasons.${r}`) }}</label>
        </div>
      </fieldset>

      <DsTextField
        id="message"
        v-model="message"
        multiline
        required
        :label="t('dispute.message')"
        :required-text="t('common.required')"
        :hint="t('dispute.hint', { max: DISPUTE_MESSAGE_MAX })"
        :error="errors.message"
        :error-prefix="t('common.errorPrefix')"
      />

      <DsButton type="submit" :disabled="submitting">{{ submitting ? t('dispute.submitting') : t('dispute.submit') }}</DsButton>
      <NuxtLink class="cancel" to="/portal/invoices">{{ t('dispute.cancel') }}</NuxtLink>
    </form>
  </section>
</template>

<style scoped>
form { max-width: 40rem; }
fieldset { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-3); margin: 0 0 var(--space-4); }
legend { font-weight: 600; padding: 0 var(--space-1); }
.req { font-weight: 400; color: var(--color-text-muted); }
.radio { display: flex; gap: var(--space-2); align-items: center; min-height: var(--control-min-height); }
.radio input { width: 1.25rem; height: 1.25rem; }
.field-error { margin: 0 0 var(--space-1); color: var(--color-error); font-weight: 600; }
.cancel { margin-left: var(--space-3); }
</style>
