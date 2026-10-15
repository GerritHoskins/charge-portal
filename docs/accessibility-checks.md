# Accessibility checks

Two layers, kept honest about what each can claim.

## Automated (runs in CI)

| What | Where |
|---|---|
| axe, WCAG 2.2 A/AA tags, on every migrated route incl. the English login page | `tests/e2e/portal.spec.ts`, `invoices.spec.ts`, `auth.spec.ts` |
| axe on every design-system story in every tenant theme | `tests/e2e/storybook.spec.ts` |
| Colour contrast of every text/background token pair in every tenant (4.5:1) | `tests/unit/tokens.test.ts` |
| Keyboard-only login and dispute flow, focus order, focus moves to error summary and confirmation | `auth.spec.ts`, `invoices.spec.ts` |
| Skip link, `lang` attribute follows the locale, live region for the filter result | `portal.spec.ts`, `auth.spec.ts` |
| Mobile (320 and 375 px): no sideways page scroll, axe clean, tap targets >= 44 px, inputs >= 16 px, compact header, tables scroll in a focusable named region | `tests/e2e/mobile.spec.ts` |
| Lighthouse accessibility score = 100 on four routes | `lighthouserc.cjs` |

Automated tools find roughly a third of real accessibility problems. Passing them is necessary, not sufficient.

## Manual checklist (status: NOT YET PERFORMED)

No screen-reader or assistive-technology session has been run on this app. The table is the plan; fill in date, tool
and result per row when it is done, and do not tick a row you did not run.

| Check | Tool / how | Result |
|---|---|---|
| Login: field labels, error announcement, password manager fill | NVDA + Firefox, VoiceOver + Safari | not performed |
| Stations: table navigation (caption, row headers), filter result announcement | NVDA, VoiceOver | not performed |
| Dispute form: error summary focus, link to field, radio group legend/error | NVDA, VoiceOver | not performed |
| Language switch: announcement and pronunciation after switching to English | NVDA, VoiceOver | not performed |
| 200% zoom on all routes; real-device check (iOS Safari, Android Chrome) | Browser zoom, physical devices | not performed (320 px reflow is automated, see above) |
| Windows high-contrast / forced colours | Edge forced-colors | not performed |
| `prefers-reduced-motion` respected | OS setting | covered by `base.css` rule, not manually verified |
| Voice control: every control reachable by its visible label | Voice Control / Dragon | not performed |
