## What and why

<!-- The user or business outcome, not only the diff. Link the ADR if a decision changed. -->

## Checklist

- [ ] Test written first for each behaviour change (`npm run check` passes locally)
- [ ] New/changed legacy data goes through a `shared/contracts` schema, with an invalid-case test
- [ ] Accessibility: axe check for new routes/components; keyboard path tested for new interactions
- [ ] Strings added to **both** `i18n/locales/de.json` and `en.json`
- [ ] Only design-system components and tokens used (tokens changed in `tokens/tokens.json`, not the CSS)
- [ ] `docs/migration-routes.json` updated if a page was added, migrated or rolled back
- [ ] Rollback considered: what happens with `NUXT_ROLLOUT=<route>=0`?
- [ ] I can explain every line, including generated code

## Risks and what I did not do

<!-- Honest limits: untested paths, follow-ups, things reviewers should look at first. -->
