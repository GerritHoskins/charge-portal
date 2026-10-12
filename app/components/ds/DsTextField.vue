<script setup lang="ts">
// DS components import from 'vue' explicitly: they also run in Storybook and Vitest,
// where Nuxt's auto-imports do not exist.
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    hint?: string
    error?: string
    multiline?: boolean
    rows?: number
    /** Text appended to the label for required fields, e.g. "(Pflichtfeld)". */
    requiredText?: string
    /** Read out before the error message for screen readers. */
    errorPrefix?: string
  }>(),
  { hint: undefined, error: undefined, requiredText: undefined, rows: 5, errorPrefix: 'Fehler: ' },
)

const model = defineModel<string>({ default: '' })

const hintId = computed(() => (props.hint ? `${props.id}-hint` : undefined))
const errorId = computed(() => (props.error ? `${props.id}-error` : undefined))
const describedBy = computed(() => [hintId.value, errorId.value].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="ds-field">
    <label :for="id">{{ label }}<template v-if="requiredText"> <span class="ds-field__req">{{ requiredText }}</span></template></label>
    <p v-if="hint" :id="hintId" class="ds-field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="ds-field__error"><span class="sr-only">{{ errorPrefix }}</span>{{ error }}</p>
    <textarea
      v-if="multiline"
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :rows="rows"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
    />
  </div>
</template>

<style scoped>
.ds-field {
  margin-bottom: var(--space-4);
}
label {
  display: block;
  font-weight: 600;
}
.ds-field__req {
  font-weight: 400;
  color: var(--color-text-muted);
}
.ds-field__hint {
  margin: 0 0 var(--space-1);
  color: var(--color-text-muted);
}
.ds-field__error {
  margin: 0 0 var(--space-1);
  color: var(--color-error);
  font-weight: 600;
}
input,
textarea {
  width: 100%;
  font: inherit;
  padding: var(--space-2);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
}
[aria-invalid='true'] {
  border-color: var(--color-error);
}
</style>
