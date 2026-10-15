# Task: Implement Mobile-First Responsive Styling

## Environment
- Project: `C:\Users\Gerrit\job-search\charge-portal-nuxt`
- Stack: Nuxt / Vue / Vite
- Model: Local Qwen3.8:27B
- Context budget: 64K tokens
- Styling: Existing token-driven design system
- Progress log: `docs/progress/mobile-responsive/progress_log.md`

## Objective

Implement the approved mobile-first responsive styling plan.

Do not introduce Tailwind, Bootstrap, another CSS framework, or new dependencies.

Preserve existing architecture, styling conventions, and functionality.

Follow `AGENTS.md`, especially its test-first and design-token requirements.

## Execution Rules

1. Execute steps sequentially.
2. Make the smallest necessary changes.
3. Never repeat completed analysis unnecessarily.
4. Inspect only files relevant to the current step.
5. Read no more than 150 lines per tool call unless essential.
6. Limit repository search output to approximately 20 results.
7. Exclude `node_modules`, `.git`, `.nuxt`, `dist`, `coverage`, and generated files from searches.
8. Do not output complete build logs or large diffs.
9. Do not install dependencies.
10. Do not modify unrelated files.
11. Do not overwrite or discard existing uncommitted changes.
12. Never hand-edit generated CSS.
13. Stop after two failed attempts to resolve the same error.
14. Do not commit, push, reset, or clean Git history.

### Progress tracking — mandatory

After **every completed implementation step**, update:

`docs/progress/mobile-responsive/progress_log.md`

Create the directory and file if they do not exist.

Use this structure:

```markdown
# Mobile Responsive Implementation Progress

## Status
Current step:
Completed steps:
Next step:

## Decisions
- ...

## Completed Changes
### Step N
- Files modified:
- Changes made:
- Validation performed:
- Result:

## Outstanding Issues
- ...

## Next Action
- ...
```

Keep entries concise and factual.

Update the existing log instead of duplicating entries. Preserve previous progress.

Before starting a step, consult the log to determine whether the work has already been completed.

The log is also the recovery point if Claude Code runs out of context.

## Step 0 — Preflight

Perform a minimal inspection:

1. Read relevant instructions from `AGENTS.md`.
2. Read the existing progress log, if present.
3. Check `git status --short`.
4. Inspect the relevant existing token configuration and available npm scripts.
5. Confirm the acceptance test exists at `tests/e2e/mobile.spec.ts`.

Important:

- The acceptance test may be untracked.
- Never delete, overwrite, or recreate it without inspecting its contents.
- Preserve all existing user changes.
- Do not repeat the previous architecture evaluation.

Record findings in the progress log.

## Step 1 — Add Breakpoint Tokens

Source of truth:

`tokens/tokens.json`

Add to the existing `base` token definitions:

- `--bp-md`: `40rem` (640px)
- `--bp-lg`: `64rem` (1024px)

Requirements:

- Follow the existing token JSON schema.
- Verify the token generator supports the new entries.
- Preserve existing token naming conventions.
- Do not add new spacing or typography scales.
- Do not edit `app/assets/css/tokens.css` manually.

Regenerate tokens:

```bash
npm run tokens
```

Confirm that the generated CSS reflects the approved tokens.

Breakpoint strategy:

- Base: mobile, including 320px
- Medium: `@media (min-width: 40rem)` — `/* --bp-md */`
- Large: `@media (min-width: 64rem)` — `/* --bp-lg */`

CSS custom properties cannot be used directly as media query conditions. Keep media-query values synchronized with the documented tokens.

Update progress log.

## Step 2 — Responsive DsDataTable

Target:

`app/components/ds/DsDataTable.vue`

Implement:

1. Wrap the existing table in a horizontally scrollable container.
2. Set `max-width: 100%` and `overflow-x: auto`.
3. Give the scroll container an accessible name.
4. Introduce a `label` prop if the component does not already support an equivalent mechanism.
5. Use `role="region"` and `aria-label` where appropriate.
6. Use `tabindex="0"` to allow sequential keyboard access to the scroll container, if needed.
7. Prevent horizontal overflow at page level.
8. Preserve existing table semantics, slots, props, and behavior.
9. Use existing design tokens for spacing and visual styling.
10. Preserve the existing desktop presentation.

Use mobile-first base styling.

Apply the documented medium breakpoint only where required.

Avoid fixed widths that cause viewport overflow.

Do not convert the table into cards.

Update progress log.

## Step 3 — Responsive Stations Page

Target:

`app/pages/portal/stations/index.vue`

Requirements:

1. Use the existing `DsDataTable`.
2. Pass `label="Ladestationen"`.
3. Make the base layout single-column.
4. Restore the existing desktop layout at the appropriate breakpoint.
5. Remove or adapt fixed widths that cause horizontal overflow.
6. Reuse existing spacing tokens.
7. Preserve all existing functionality.

Do not modify unrelated portal pages.

Update progress log.

## Step 4 — Responsive Application Header

Target:

`app/app.vue`

Requirements:

1. Ensure interactive controls satisfy the 44px minimum tap-target acceptance requirement.
2. Use `min-height: var(--control-min-height)` where appropriate.
3. Ensure controls have sufficient width or effective target size.
4. Adapt header layout for mobile screens.
5. Keep header height at or below 190px at tested mobile widths.
6. Prevent text and controls from overflowing.
7. Preserve desktop layout and navigation behavior.

Prefer flex wrapping, appropriate gaps, and mobile-first rules.

Do not redesign the header.

Update progress log.

## Step 5 — Responsive Login Page

Find the existing login page using a targeted search.

Requirements:

1. Inputs must be at least 44px tall.
2. Buttons must meet the 44px target-size requirement.
3. Inputs must use a minimum font size of 16px.
4. Use existing design tokens.
5. Prevent horizontal overflow at 320px.
6. Preserve existing authentication behavior.
7. Preserve the existing visual design.

Reuse existing design-system components when possible.

Update progress log.

## Step 6 — Acceptance Testing

Existing acceptance test:

`tests/e2e/mobile.spec.ts`

Treat this test as the primary specification.

Before changing it:

- Inspect existing assertions.
- Preserve intended acceptance requirements.
- Do not weaken or remove assertions simply to make tests pass.
- Extend tests only when necessary to cover approved behavior.
- Do not change application behavior solely to hide test failures.

Run:

```bash
npm run check
```

Then:

```bash
npx playwright test tests/e2e/mobile.spec.ts
```

Verify the relevant signed-in and signed-out scenarios at 320px and 375px.

Acceptance criteria:

- No page-level horizontal overflow.
- Wide table scrolls within its own region.
- Region has accessible name "Ladestationen".
- Scroll region is keyboard accessible.
- Header height is at most 190px.
- Required interactive controls meet 44px sizing.
- Login inputs are at least 44px tall.
- Login input font size is at least 16px.
- No new accessibility violations under the configured axe WCAG 2 A/AA, 2.1, and 2.2 checks.
- Existing desktop behavior is preserved.

Use additional browser-based inspection if available.

If authenticated tests require unavailable credentials or state, report the blocker. Do not fabricate test results.

Update progress log with actual test results.

## Step 7 — Final Review

Review:

```bash
git status --short
git diff --stat
```

Inspect relevant diffs in small sections.

Verify:

- Only planned files and the progress log were changed.
- Generated CSS matches the token source.
- No new dependencies were added.
- Existing user changes were preserved.
- No unnecessary refactoring occurred.
- No acceptance assertions were weakened.

Update `docs/accessibility-checks.md` only if required by actual behavior changes.

Write the final implementation status to the progress log.

## Error Recovery

When a command fails:

1. Inspect the relevant error output.
2. Identify the likely cause.
3. Apply one targeted correction.
4. Retry once.
5. If it still fails, stop the affected step.

Record the blocker in the progress log.

Do not enter repeated tool-call loops.

Never claim a test passed unless it actually passed.

## Context Management

The available context window is 64K tokens.

Prevent repeated automatic compaction:

- Keep tool results small.
- Do not repeatedly read the same files.
- Do not dump full source trees.
- Do not print entire command logs.
- Avoid unnecessary repository exploration.
- Use the progress log as persistent task memory.
- Keep progress updates short.
- Avoid lengthy explanations between steps.

If context becomes crowded:

1. Finish the current atomic change if safe.
2. Update the progress log.
3. Record completed work, remaining work, and blockers.
4. Stop execution.
5. Provide a concise handoff for a fresh session.

Do not attempt repeated compaction cycles.

## Execution Policy

The implementation plan is approved.

Proceed through Steps 0–7 without requesting approval between successful steps.

Request user input only if:

- An architectural conflict is discovered.
- A destructive operation is required.
- A dependency must be added.
- Requirements are contradictory.
- The implementation cannot continue safely.

## Final Response Format

Keep the response under 300 words.

Include:

1. Completed steps.
2. Modified files.
3. Test results.
4. Remaining issues.
5. Progress log location.

Do not repeat the entire implementation plan.

**Begin with Step 0. Execute one step at a time and update the progress log after every completed step.**