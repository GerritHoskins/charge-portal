# Work-package execution and Codex advice

Applies to implementation work packages and numbered implementation steps in this repository.
Read `AGENTS.md` first. Package-specific scope and acceptance criteria still apply.

## Backlog and selection

- Keep the backlog, dependencies, and decisions in repository documents, outside chat history.
- The package index defines order and dependencies; each package defines its objective,
  read list, editable files, exclusions, and acceptance checks. Use
  `work-package-template.md` for new packages. Existing numbered steps may use the same
  fields in their progress log without rewriting the original plan.
- The plan's existing progress log is the authoritative execution record. Do not maintain
  competing status lists in package files. Keep one package In progress per working tree.
- Use these states: Ready (specified and prerequisites verified), In progress, Review
  (implementation and required checks complete), Done (human review accepted), and Blocked.
  Packages whose prerequisites are incomplete remain pending. Record a blocker explicitly.
- Read only the selected package, shared context, its dependency handoffs, and the relevant
  progress-log entries. Do not load every package or the entire planning document.
- Confirm prerequisite implementation and checks against the current checkout. Historical
  completion claims are evidence to verify, not proof of the current state.

## Execute one package

1. Check the repository root, branch, HEAD, and `git status --short`. Preserve user changes.
2. Identify the package's goal, editable files, acceptance checks, and exclusions. If these
   are missing or contradictory, consult Codex to propose a bounded interpretation before
   asking the user for a decision that materially changes requirements.
3. Mark the selected package In progress in its existing progress log. Read its starting
   files and nearby implementation patterns. Targeted additional reads are allowed when
   needed to verify a dependency or diagnose a failure; record why they were needed.
4. Write and run a failing test before a behavior change, then implement the smallest change.
   Change only package-authorized files and the designated progress log. A newly required
   file outside the edit scope needs a scope decision; Codex can advise but cannot authorize it.
5. Run the package checks and `npm run check` before handing implementation to Review.
   Do not weaken assertions or budgets to pass. Record pre-existing failures separately;
   a required check that fails or cannot run prevents a claim of verified completion.
6. Inspect the diff, record the handoff, and move to Review when checks pass. Human acceptance
   moves it to Done. Do not start the next package automatically or commit/push without
   explicit authorization. A passing test run or advisor opinion is not human acceptance.

## Codex advisor: consult before technical escalation

For Qwen, consultation is required when a technical blocker prevents progress, the same
failure remains after two targeted attempts, or a second opinion is needed on a proposed
implementation, diagnosis, or review finding. Consult earlier when useful.

1. Pause the affected implementation step and record the observed failure and attempts.
   Do not repeat an unchanged command or continue speculative edits.
2. Use the configured Codex advisor tool/bridge, including the Mac connection if configured.
   Check the available tool description and connection once. This document does not install
   a bridge, identify a host, or prove connectivity. Do not invent tool names or endpoints,
   extract subscription tokens, or configure new credentials/network access as a workaround.
3. Request advice/review only. Send the package ID and goal, relevant constraints, branch/HEAD,
   a small diff or code excerpt, exact error, checks attempted and their results, and one
   focused question. Include the actual code needed: the Mac cannot read Windows paths
   unless access has already been configured. Redact secrets and unrelated personal data.
4. Ask Codex for the likely cause, evidence, smallest proposed correction, and verification
   command. Ask it to identify missing context and uncertainty. It must not edit the shared
   working tree, commit, push, publish, or delegate the question back to Qwen.
5. Evaluate the advice against this checkout and `AGENTS.md`. Apply supported corrections
   within the package scope and existing authorization, then rerun the relevant checks.
   Record which recommendation was used and the observed result.
6. Allow one focused follow-up to Codex with new evidence and at most two targeted correction
   attempts after the initial advice. If still unresolved, stop the affected package, mark
   it Blocked, and escalate with a concise explanation. These limits prevent advisor loops.

If Codex is unavailable, unauthenticated, times out, or has no configured connection,
record the actual failure (or missing connection), preserve a compact consultation request,
and report that limitation to the user. Never claim consultation happened without a response.
Continue only independent, in-scope work that does not rely on the unresolved issue.

Escalation must include: package and blocker; local attempts; Codex recommendation or
availability failure; verification results; and the smallest decision/access needed from
the user. Questions requiring human authority (credentials, destructive operations,
external writes, dependencies, or material scope/requirements changes) still require the
user's decision. Codex can help frame those choices but cannot approve them.

## Context and handoff

- Start a fresh session for each package. Use the progress log to resume an unfinished one.
- Read roughly 150 lines at a time and cap search results around 20 matches. Exclude generated
  output and dependency directories. Bound characters/bytes too: a minified line can be huge.
- Retain the command exit status and relevant error excerpt, not full logs. Inspect more
  narrowly when the last lines omit the cause. Read diffs one file or hunk at a time.
- Keep tools relevant to the task, including the Codex advisor. If fixed tool definitions
  already fill the window, record that configuration blocker; repeated compaction cannot
  fix it. Do not remove tools or change the runtime configuration without authorization.
- Before context fills, finish the current small edit if safe and write a handoff. Resume
  the same package with bounded context rather than repeatedly compacting.
- Each handoff records: package/status, branch/HEAD and dirty files, implemented changes,
  exact commands/results, unresolved failures, Codex question/advice/result when used,
  decisions and the next concrete action. Keep entries short and preserve earlier evidence.
- Use ordinary interactive execution for package work. Do not turn the backlog into
  unattended scheduled jobs or raise approval settings unless that execution mode was
  explicitly requested and its installed-runtime behavior has been checked.
