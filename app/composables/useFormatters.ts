// Locale-aware formatters. The time zone is fixed so server and client render identical
// text (no hydration mismatch); only the language follows the user's locale.
const INTL_LOCALES = { de: 'de-DE', en: 'en-GB' } as const

export const useFormatters = () => {
  const { locale } = useI18n()
  const intl = computed(() => INTL_LOCALES[locale.value as keyof typeof INTL_LOCALES] ?? INTL_LOCALES.de)
  const timeZone = 'Europe/Berlin'

  return {
    date: (iso: string) => new Intl.DateTimeFormat(intl.value, { dateStyle: 'medium', timeZone }).format(new Date(iso)),
    dateTime: (iso: string) => new Intl.DateTimeFormat(intl.value, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso)),
    kwh: (value: number) => new Intl.NumberFormat(intl.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value),
    money: (cents: number) => new Intl.NumberFormat(intl.value, { style: 'currency', currency: 'EUR' }).format(cents / 100),
  }
}
