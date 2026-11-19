---
---

CI: independent review gate — the always-run fail-closed step no longer overwrites a posted verdict. It used to re-read the check's status right after the verdict was written; a stale read turned a pass (and a draft refusal) into "Review job failed" (no shipped code changes). The step that completes the check now records it, and `abort` keeps the check only on that record.
