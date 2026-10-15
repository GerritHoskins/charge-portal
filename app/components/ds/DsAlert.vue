<script setup lang="ts">
import { useTemplateRef } from 'vue'

const props = withDefaults(defineProps<{ tone?: 'error' | 'info' }>(), { tone: 'error' })

// Errors interrupt (role=alert); info is announced politely (role=status).
const root = useTemplateRef<HTMLElement>('root')
// Lets a form move focus to its error summary after a failed submit.
defineExpose({ focus: () => root.value?.focus() })
</script>

<template>
  <div ref="root" class="ds-alert" :class="`ds-alert--${props.tone}`" :role="props.tone === 'error' ? 'alert' : 'status'" tabindex="-1">
    <slot />
  </div>
</template>

<style scoped>
.ds-alert {
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  max-width: 40rem;
}
.ds-alert--error {
  border-color: var(--color-error);
}
.ds-alert--error :deep(h2) {
  margin: 0 0 var(--space-2);
  font-size: 1.125rem;
  color: var(--color-error);
}
.ds-alert :deep(p),
.ds-alert :deep(ul) {
  margin: 0;
}
.ds-alert :deep(ul) {
  padding-left: var(--space-4);
}
</style>
