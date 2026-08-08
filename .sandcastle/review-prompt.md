# Task

Review the work just committed for issue **#{{ISSUE}}** — _{{ISSUE_TITLE}}_ — and
**fix what you find**. You are a fresh pair of eyes: you did not write this code,
you have no attachment to it, and nobody will read a report you write. Corrections
must land as commits or they did not happen.

# Context

## The ticket this was supposed to satisfy

!`gh issue view {{ISSUE}} --json number,title,body,comments --jq '{number, title, body, comments: [.comments[].body]}'`

## What the implementer changed

!`git log {{BASE_SHA}}..HEAD --oneline`

!`git diff {{BASE_SHA}} --stat`

!`git diff {{BASE_SHA}}`

# Review process

Follow the two-axis process documented in `.claude/skills/code-review/SKILL.md`,
with one adaptation: run **both axes yourself, inline**. Do not spawn sub-agents,
and do not produce the side-by-side report — you are here to fix, not to file.

- **Fixed point** is `{{BASE_SHA}}` — the branch as it stood before this ticket.
  Everything above it is this ticket's work, which may be more than one commit if
  the implementer had to fix a failing gate. **Spec source** is issue #{{ISSUE}},
  fetched above.
- **Spec axis** — does the diff actually satisfy every acceptance criterion in
  the ticket? Check each box in turn. An unmet criterion is the single most
  important thing you can catch here; a plausible-looking diff that misses the
  point is exactly what an unattended run produces.
- **Standards axis** — apply the skill's Fowler smell baseline, plus this repo's
  own documented rules: `CLAUDE.md`, `CONTEXT.md` (use the glossary's vocabulary,
  in Portuguese where the domain is Portuguese), the ADRs in `docs/adr/`, and for
  anything under `convex/`, `convex/_generated/ai/guidelines.md`.

Beyond those two axes, check correctness the tests may not cover:

- Are the new behaviours actually covered by tests, or just asserted to be?
- Unsafe casts, `any`, non-null assertions, unchecked assumptions.
- Convex specifics: missing index on a filtered query, an unauthenticated
  mutation, a schema change that needs a migration in `convex/migrations.ts`
  but did not get one.
- Injection, credential leaks, or authorization gaps — this app has per-ramo
  visibility rules that are easy to bypass by accident.
- Did the implementer include a `.changeset/*.md` entry? `CLAUDE.md` requires it.

# Execution

Make corrections **directly on this branch**:

1. Fix what you found. Preserve intent — change how the code does it, not what it
   does, unless what it does contradicts the ticket.
2. Re-run the gate and get it green: `bun run lint`, `bun run test`, `bun run build`
   (`bun run test`, not bare `bun test` — the latter pulls in Playwright specs
   that cannot run here).
3. Commit with a `review:` prefix, describing what you corrected and why.

Do not push, do not open a pull request, do not close the issue — the harness
handles all three at the end of the session. Never commit to `{{TARGET_BRANCH}}`,
and never deploy anything.

If a problem is real but too large to fix safely here — it needs a design
decision, or it belongs to a different ticket — leave a comment on issue
#{{ISSUE}} describing it rather than half-fixing it.

If the code is already correct and clean, change nothing and commit nothing.
That is a valid outcome; say so.

# Done

When the review is finished, output the completion signal:

<promise>COMPLETE</promise>
