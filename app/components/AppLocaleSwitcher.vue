<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()

const localeOptions = computed(() => locales.value.map((entry) => ({
  code: entry.code,
  name: entry.name ?? entry.code,
})))

const onLocaleChange = (event: Event) => {
  void setLocale((event.target as HTMLSelectElement).value as 'de' | 'en')
}
</script>

<template>
  <div class="lang">
    <label for="locale-select" class="lang__label">{{ t('nav.language') }}</label>
    <select id="locale-select" :value="locale" @change="onLocaleChange">
      <option v-for="entry in localeOptions" :key="entry.code" :value="entry.code">
        {{ entry.name }}
      </option>
    </select>
  </div>
</template>
