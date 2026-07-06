

## comunication
be concise and sacrifice grammar for the sake of concision

## Deployment

**Never deploy to prod unless explicitly asked.** Prod ships only via the tag-driven `deploy-prod.yml` workflow (`gh workflow run deploy-prod.yml -f tag=vX.Y.Z`), triggered by the user.

Merging to master auto-deploys **staging only** (Vercel preview alias + staging Convex via `ci.yml`). Full environment/release/migration runbook: `docs/deploy.md`.

Migrations use `@convex-dev/migrations`: define, append to `REGISTRY` in `convex/migrations.ts`, never edit or reorder one that has run anywhere.

## GitHub

Always use the `gh` CLI to interface with GitHub (PRs, issues, releases, etc.). Never use the GitHub web UI or direct API calls.

## Branching & Commits

**Never commit directly to `master` unless explicitly asked.** When you have changes to commit:
1. Create a new branch with a descriptive name.
2. Commit the changes to that branch.
3. Open a PR targeting `master` using `gh pr create`.

## Quality Checks

After any code changes, always run:
1. `bun test` — run the test suite
2. `bun run lint` — check for lint errors

Fix any failures before considering the task done.

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management. It is not published to npm, so never use `bun run release`.

**IMPORTANT: Always create a changeset before committing any feature, fix, or meaningful change.** Do not commit without one.

Workflow:
1. After completing a feature or fix, create a changeset file in `.changeset/` (choose `patch`, `minor`, or `major` and write a short description).
2. Include the changeset file in the same commit as the code changes.
3. Before a release, run `bun run version` to consume pending changesets, bump `package.json`, and generate/update `CHANGELOG.md`.
4. Commit the resulting changes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Workflows & subagents — model routing

When building/running workflows (Workflow tool) or spawning subagents (Agent tool, `.claude/agents/*.md`), pick the model tier yourself from the rubric below. **Don't ask which model — infer it.** Only surface a choice when a task is both expensive and genuinely ambiguous in difficulty; even then, pick, note it in one line, and proceed.

Tiers, capability↓ / cost↓ (input/output per Mtok): `fable` ($10/$50) > `opus` ($5/$25) > `sonnet` ($3/$15) > `haiku` ($1/$5).

**Lean: quality-first.** Default non-trivial work to `opus`. Reserve cheap tiers for clearly mechanical work.

- **fable** — orchestration + hardest reasoning + design. The main workflow driver (decomposition, planning, judge panels, adversarial verification, long-horizon multi-step, final synthesis of subagent output) and all architecture design and UI design.
- **opus** — default for any non-trivial subagent: implementation, debugging, code review, spec-compliance checks, reasoning-heavy verification. When difficulty is unclear, default here.
- **sonnet** — clearly-scoped work with a real spec and little ambiguity: straightforward code from an exact plan, pattern-based file transforms/migrations, test scaffolding, straightforward readers/summarizers.
- **haiku** — mechanical only: grep/glob sweeps, locating files, extracting/formatting, renames, boilerplate, classification.

Effort (`low|medium|high|xhigh|max`):
never use xhigh or max
- fable: always `high`
- opus: `high` for anything intelligence-sensitive; `medium` for lighter passes.
- sonnet: `high` default; `medium` for cheap mechanical stages.
- haiku: `low`/`medium` only (`xhigh`/`max` unsupported).

Rules of thumb:
- Keep the orchestrator on ONE model (fable) for a whole run. Get cheapness by spawning cheaper-tier subagents, not by switching the main loop's model mid-run (switching breaks the prompt cache).
- **Escalate, don't retry.** If a cheaper tier's output fails verification, re-run one tier up — don't re-prompt the same tier repeatedly.
- **Verify with a peer or stronger tier.** Adversarially verify opus/fable findings with opus or fable — never rubber-stamp cheap output with the same cheap model.
- Worktree isolation (`isolation: 'worktree'`) only when subagents mutate files in parallel — it's expensive.
- Set it explicitly: Workflow → `agent(prompt, {model: 'sonnet', effort: 'medium'})`; subagent def → `model:` in `.claude/agents/*.md` frontmatter; keep `meta.phases[].model` in sync with what each phase actually uses.

## Agent skills

### Issue tracker

Issues and PRDs live in the repo's GitHub Issues, managed via the `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root (created lazily). See `docs/agents/domain.md`.
