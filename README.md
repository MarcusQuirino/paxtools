# verification-evidence

Orphan branch, never merged. Author agents publish proof that a PR works on
the running app here: `pr-<n>/log.md` + screenshots, via
`bun scripts/verify.ts publish` (docs/agents/verify.md on master). The
Independent review gate reads `pr-<n>/` for the PR it reviews. Test-persona
data only — never screenshots of prod or real members.
