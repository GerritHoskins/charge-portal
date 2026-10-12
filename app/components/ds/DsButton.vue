<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false },
)
</script>

<template>
  <button class="ds-button" :class="`ds-button--${variant}`" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.ds-button {
  font: inherit;
  font-weight: 600;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-brand);
  border-radius: var(--radius);
  cursor: pointer;
}
.ds-button--primary {
  background: var(--color-brand);
  color: var(--color-brand-contrast);
}
.ds-button--secondary {
  background: var(--color-bg);
  color: var(--color-brand);
}
.ds-button:disabled {
  opacity: 0.7;
  cursor: progress;
}
</style>
