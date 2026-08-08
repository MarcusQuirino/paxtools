# Task

Implement issue **#{{ISSUE_NUMBER}}** — _{{ISSUE_TITLE}}_ — and nothing else.

A planner already chose this ticket and confirmed its blockers are satisfied, so
do not go looking for other work or second-guess the selection. Work this one
ticket, or report that you couldn't.

You are working unattended. Nobody is watching, you cannot ask questions, and
anything you leave half-done ships. Read `CLAUDE.md` at the repo root before you
start — its rules bind you.

# Context

## The ticket

!`gh issue view {{ISSUE_NUMBER}} --json number,title,body,comments --jq '{number, title, body, comments: [.comments[].body]}'`

If it references a parent PRD, pull that in too (`gh issue view <n>`) — read it
for intent, and never edit or close it.

## Already landed on this branch, earlier in this session

{{DONE_ISSUES}}

Those tickets' code is already in your working tree. If this ticket was blocked
by one of them, that is why it is workable now — build on what's there rather
than reinventing it.

## Branch

You are on `{{SOURCE_BRANCH}}`, which merges into `{{TARGET_BRANCH}}`.

!`git log {{TARGET_BRANCH}}..{{SOURCE_BRANCH}} --oneline`

# Workflow

Follow the repo's own `/implement` workflow:

- **Explore first.** Read the ticket in full, including comments. Read the
  relevant source and tests before writing code. Respect `CONTEXT.md` glossary
  vocabulary and any ADR in `docs/adr/` covering the area you touch.
- **Use TDD at pre-agreed seams** (`.claude/skills/tdd`): failing test first,
  then the implementation that passes it. Convex functions are tested with
  `convex-test` — authenticate via `t.withIdentity({ subject: userId })` and
  follow the existing per-file `modules` convention in `convex/*.test.ts`.
- **Keep the change as small as the ticket allows.** Satisfy the acceptance
  criteria, nothing more. Do not opportunistically refactor unrelated code.
- **Backend changes are Convex.** Read `convex/_generated/ai/guidelines.md`
  before touching anything under `convex/` — those rules override what you think
  you know about Convex. Schema changes needing backfill require a migration
  appended to `REGISTRY` in `convex/migrations.ts`; never edit or reorder one
  that already exists.

# Verify before you commit

Run, and get green:

```
bun run lint
bun run test
bun run build
```

Use `bun run test`, not bare `bun test` — the script scopes the runner to `src`
and `convex`, and bare `bun test` drags in the Playwright specs, which cannot run
here and will drown you in false failures.

These are exactly what `ci.yml` runs on the pull request. Fix failures; do not
commit around them, and do not weaken a test to make it pass. Do not run the
Playwright e2e suite — it needs a browser and a live deployment this sandbox
does not have, and it runs on the host after the session.

# Changeset

`CLAUDE.md` requires one: add a `.changeset/<some-name>.md` file with the right
bump (`patch`, `minor`, or `major`) and a one-line, user-facing description, in
the same commit as the code. This project is never published to npm, so the bump
only drives the changelog.

# Commit

One commit, on the current branch:

```
<type>(<scope>): <what changed> (#{{ISSUE_NUMBER}})

<why, and any decision worth remembering>
```

Do not push, do not open a pull request, and **do not close the issue** — the
harness does all three at the end of the session, and closing early would strand
a ticket whose code has not merged yet.

Then comment on the issue with what you built and anything the reviewer should
know (`gh issue comment {{ISSUE_NUMBER}} --body '...'`).

# Rules

- **Never commit to `{{TARGET_BRANCH}}`.** You are on `{{SOURCE_BRANCH}}`; stay there.
- **Never deploy.** No `convex deploy`, no `vercel`, no `gh workflow run`.
- No commented-out code, no `TODO` left behind, no `any` sprinkled to silence the
  type checker.
- If you cannot finish — missing context, a failure you cannot fix, an external
  dependency — do **not** commit a partial implementation. Comment on the issue
  explaining precisely where you got stuck, revert your working tree, and report
  `blocked`.

# Done

When you have committed (or decided you cannot), output:

<promise>COMPLETE</promise>
